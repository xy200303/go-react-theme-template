import { useEffect, useState } from 'react';
import { Button, Input, Modal, Spin, Table } from 'antd';
import AdminPage from './AdminPage';
import {
  createEmptyConfigFormValues,
  extractApiErrorMessage,
  formLabelClassName,
  mapConfigToFormValues,
  type ConfigFormValues
} from './AdminCommon';
import { listSystemConfigs, upsertSystemConfig, type SystemConfigItem } from '@/api/endpoints/admin';
import { useI18n } from '@/i18n';
import { notifyError, notifySuccess } from '@/lib/notify';

export default function AdminConfigsPage() {
  const [loading, setLoading] = useState(false);
  const [configs, setConfigs] = useState<SystemConfigItem[]>([]);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configModalSubmitting, setConfigModalSubmitting] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SystemConfigItem | null>(null);
  const [configFormData, setConfigFormData] = useState<ConfigFormValues>(createEmptyConfigFormValues());
  const { t } = useI18n();

  const loadConfigsData = async () => {
    setLoading(true);
    try {
      setConfigs(await listSystemConfigs());
    } catch {
      notifyError(t('admin.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConfigsData();
  }, [t]);

  const updateConfigFormData = (patch: Partial<ConfigFormValues>) => {
    setConfigFormData((previous) => ({ ...previous, ...patch }));
  };

  const openCreateConfigModal = () => {
    setEditingConfig(null);
    setConfigFormData(createEmptyConfigFormValues());
    setConfigModalOpen(true);
  };

  const openEditConfigModal = (config: SystemConfigItem) => {
    setEditingConfig(config);
    setConfigFormData(mapConfigToFormValues(config));
    setConfigModalOpen(true);
  };

  const closeConfigModal = () => {
    setConfigModalOpen(false);
    setEditingConfig(null);
    setConfigFormData(createEmptyConfigFormValues());
  };

  const onSaveConfig = async () => {
    const values = {
      config_group: configFormData.config_group.trim(),
      config_key: configFormData.config_key.trim(),
      config_val: configFormData.config_val.trim(),
      remark: configFormData.remark.trim()
    };

    if (!values.config_group || !values.config_key || !values.config_val) {
      notifyError(t('admin.configRequired'));
      return;
    }

    setConfigModalSubmitting(true);
    try {
      await upsertSystemConfig(values);
      notifySuccess(t('admin.configSaved'));
      closeConfigModal();
      await loadConfigsData();
    } catch (error) {
      notifyError(extractApiErrorMessage(error) ?? t('admin.configSaveFailed'));
    } finally {
      setConfigModalSubmitting(false);
    }
  };

  return (
    <AdminPage activeKey="configs">
      {loading ? (
        <div className="flex justify-center py-10">
          <Spin size="large" />
        </div>
      ) : (
        <div className="space-y-5">
          <section className="rounded-2xl border border-blue-200/60 bg-white/70 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-sky-900">{t('admin.createConfigTitle')}</h3>
                <p className="mt-1 text-sm text-slate-500">{t('admin.configPanelDesc')}</p>
              </div>
              <Button className="ant-surface-btn-primary !h-11" onClick={openCreateConfigModal} type="primary">
                {t('admin.createConfigButton')}
              </Button>
            </div>
          </section>

          <Table
            pagination={false}
            rowKey="id"
            dataSource={configs}
            columns={[
              { title: t('admin.tableGroup'), dataIndex: 'config_group', width: 180 },
              { title: t('admin.tableKey'), dataIndex: 'config_key' },
              { title: t('admin.tableValue'), dataIndex: 'config_val' },
              { title: t('admin.tableRemark'), dataIndex: 'remark' },
              {
                title: t('admin.tableActions'),
                width: 120,
                render: (_: unknown, record: SystemConfigItem) => (
                  <Button className="ant-surface-btn-primary !h-9" onClick={() => openEditConfigModal(record)} type="primary">
                    {t('admin.editButton')}
                  </Button>
                )
              }
            ]}
          />
        </div>
      )}

      <Modal
        destroyOnHidden
        open={configModalOpen}
        confirmLoading={configModalSubmitting}
        onCancel={closeConfigModal}
        onOk={() => void onSaveConfig()}
        okText={editingConfig ? t('admin.saveButton') : t('admin.createConfigButton')}
        cancelText={t('admin.cancelButton')}
        title={editingConfig ? t('admin.editConfigTitle') : t('admin.createConfigTitle')}
        width={680}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block">
              <span className={formLabelClassName}>{t('admin.tableGroup')}</span>
              <Input
                className="ant-surface-input"
                placeholder={t('admin.configGroupPlaceholder')}
                value={configFormData.config_group}
                onChange={(event) => updateConfigFormData({ config_group: event.target.value })}
              />
            </label>

            <label className="block">
              <span className={formLabelClassName}>{t('admin.tableKey')}</span>
              <Input
                className="ant-surface-input"
                disabled={Boolean(editingConfig)}
                placeholder={t('admin.configKeyPlaceholder')}
                style={editingConfig ? { color: '#94a3b8' } : undefined}
                value={configFormData.config_key}
                onChange={(event) => updateConfigFormData({ config_key: event.target.value })}
              />
            </label>
          </div>

          <label className="block">
            <span className={formLabelClassName}>{t('admin.tableValue')}</span>
            <Input.TextArea
              className="ant-surface-textarea"
              placeholder={t('admin.configValuePlaceholder')}
              rows={4}
              value={configFormData.config_val}
              onChange={(event) => updateConfigFormData({ config_val: event.target.value })}
            />
          </label>

          <label className="block">
            <span className={formLabelClassName}>{t('admin.tableRemark')}</span>
            <Input.TextArea
              className="ant-surface-textarea"
              placeholder={t('admin.configRemarkPlaceholder')}
              rows={3}
              value={configFormData.remark}
              onChange={(event) => updateConfigFormData({ remark: event.target.value })}
            />
          </label>
        </div>
      </Modal>
    </AdminPage>
  );
}
