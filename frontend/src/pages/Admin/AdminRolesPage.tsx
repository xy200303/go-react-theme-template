import { useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, Input, Modal, Spin, Table, Tag } from 'antd';
import AdminPage from './AdminPage';
import {
  buildPoliciesFromSelection,
  buildSectionAggregatePolicies,
  createEmptyRoleFormValues,
  extractApiErrorMessage,
  formLabelClassName,
  getPolicyMethodColor,
  mapRoleToFormValues,
  matchesPolicyTemplate,
  uniquePolicies,
  type PolicyTemplate,
  type PolicyTemplateSection,
  type RoleFormValues
} from './AdminCommon';
import {
  createRole,
  deleteRole,
  getRolePolicies,
  listPolicyTemplates,
  listRoles,
  setRolePolicies,
  updateRole,
  type PolicyTemplateItem,
  type RoleItem,
  type RolePolicy
} from '@/api/endpoints/admin';
import { useI18n } from '@/i18n';
import { notifyError, notifySuccess } from '@/lib/notify';

export default function AdminRolesPage() {
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [policyTemplateItems, setPolicyTemplateItems] = useState<PolicyTemplateItem[]>([]);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleModalSubmitting, setRoleModalSubmitting] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [roleFormData, setRoleFormData] = useState<RoleFormValues>(createEmptyRoleFormValues());
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [policyRole, setPolicyRole] = useState<RoleItem | null>(null);
  const [selectedPolicyKeys, setSelectedPolicyKeys] = useState<string[]>([]);
  const [unmatchedPolicies, setUnmatchedPolicies] = useState<RolePolicy[]>([]);
  const { t } = useI18n();

  const policyTemplates = useMemo<PolicyTemplate[]>(
    () =>
      policyTemplateItems.map((item) => ({
        key: item.key,
        menuKey: item.menu_key,
        menuLabel: item.menu_label,
        actionLabel: item.action_label,
        description: item.description,
        method: item.method,
        path: item.path
      })),
    [policyTemplateItems]
  );
  const policyTemplateByIdentity = useMemo(
    () => new Map(policyTemplates.map((item) => [`${item.method} ${item.path}`, item])),
    [policyTemplates]
  );
  const policyTemplatesByMenu = useMemo<PolicyTemplateSection[]>(() => {
    const grouped = new Map<string, { menuLabel: string; items: PolicyTemplate[] }>();
    policyTemplates.forEach((item) => {
      const existing = grouped.get(item.menuKey);
      if (existing) {
        existing.items.push(item);
        return;
      }
      grouped.set(item.menuKey, { menuLabel: item.menuLabel, items: [item] });
    });
    return Array.from(grouped.entries()).map(([menuKey, value]) => ({ menuKey, ...value }));
  }, [policyTemplates]);
  const selectedPolicyKeySet = useMemo(() => new Set(selectedPolicyKeys), [selectedPolicyKeys]);
  const isReservedRole = (roleName?: string) => roleName === 'admin';

  const loadRolesData = async () => {
    setLoading(true);
    try {
      setRoles(await listRoles());
    } catch {
      notifyError(t('admin.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRolesData();
  }, [t]);

  useEffect(() => {
    listPolicyTemplates()
      .then(setPolicyTemplateItems)
      .catch(() => notifyError(t('admin.policyTemplateLoadFailed')));
  }, [t]);

  const updateRoleFormData = (patch: Partial<RoleFormValues>) => {
    setRoleFormData((previous) => ({ ...previous, ...patch }));
  };

  const openCreateRoleModal = () => {
    setEditingRole(null);
    setRoleFormData(createEmptyRoleFormValues());
    setRoleModalOpen(true);
  };

  const openEditRoleModal = (role: RoleItem) => {
    setEditingRole(role);
    setRoleFormData(mapRoleToFormValues(role));
    setRoleModalOpen(true);
  };

  const closeRoleModal = () => {
    setRoleModalOpen(false);
    setEditingRole(null);
    setRoleFormData(createEmptyRoleFormValues());
  };

  const closePolicyModal = () => {
    setPolicyModalOpen(false);
    setSelectedPolicyKeys([]);
    setUnmatchedPolicies([]);
    setPolicyRole(null);
  };

  const onCreateRole = async () => {
    const values = {
      name: roleFormData.name.trim(),
      display_name: roleFormData.display_name.trim(),
      description: roleFormData.description.trim()
    };

    if (!values.name || !values.display_name) {
      notifyError(t('admin.roleRequired'));
      return;
    }

    setRoleModalSubmitting(true);
    try {
      if (editingRole) {
        await updateRole(editingRole.id, { display_name: values.display_name, description: values.description });
        notifySuccess(t('admin.roleUpdated'));
      } else {
        await createRole(values);
        notifySuccess(t('admin.roleCreated'));
      }
      closeRoleModal();
      await loadRolesData();
    } catch (error) {
      notifyError(extractApiErrorMessage(error) ?? (editingRole ? t('admin.roleUpdateFailed') : t('admin.roleCreateFailed')));
    } finally {
      setRoleModalSubmitting(false);
    }
  };

  const onDeleteRole = async (role: RoleItem) => {
    try {
      await deleteRole(role.id);
      notifySuccess(t('admin.roleDeleted'));
      await loadRolesData();
    } catch (error) {
      notifyError(extractApiErrorMessage(error) ?? t('admin.roleDeleteFailed'));
    }
  };

  const openPolicies = async (role: RoleItem) => {
    try {
      const policies = await getRolePolicies(role.id);
      const matchedKeys = new Set<string>();
      const matchedPolicyIndexes = new Set<number>();
      const legacyPolicies: RolePolicy[] = [];

      policyTemplatesByMenu.forEach((section) => {
        const aggregatePolicies = buildSectionAggregatePolicies(section.menuKey);
        if (!aggregatePolicies.length) {
          return;
        }

        const matchedIndexes: number[] = [];
        const allMatched = aggregatePolicies.every((aggregatePolicy) => {
          const matchedIndex = policies.findIndex(
            (policy, index) =>
              !matchedPolicyIndexes.has(index) &&
              policy.method === aggregatePolicy.method &&
              policy.path === aggregatePolicy.path
          );

          if (matchedIndex === -1) {
            return false;
          }

          matchedIndexes.push(matchedIndex);
          return true;
        });

        if (allMatched) {
          section.items.forEach((item) => matchedKeys.add(item.key));
          matchedIndexes.forEach((index) => matchedPolicyIndexes.add(index));
        }
      });

      policies.forEach((policy, index) => {
        if (matchedPolicyIndexes.has(index)) {
          return;
        }

        const matched = policyTemplateByIdentity.get(`${policy.method} ${policy.path}`);
        if (matched) {
          matchedKeys.add(matched.key);
          matchedPolicyIndexes.add(index);
          return;
        }

        policyTemplates.forEach((template) => {
          if (matchesPolicyTemplate(policy, template)) {
            matchedKeys.add(template.key);
            matchedPolicyIndexes.add(index);
          }
        });
      });

      policies.forEach((policy, index) => {
        if (!matchedPolicyIndexes.has(index)) {
          legacyPolicies.push(policy);
        }
      });

      setSelectedPolicyKeys(Array.from(matchedKeys));
      setUnmatchedPolicies(legacyPolicies);
      setPolicyRole(role);
      setPolicyModalOpen(true);
    } catch {
      notifyError(t('admin.policyLoadFailed'));
    }
  };

  const savePolicies = async () => {
    if (!policyRole) {
      return;
    }

    const templatePolicies = buildPoliciesFromSelection(selectedPolicyKeys, policyTemplatesByMenu);
    const policies = uniquePolicies([...templatePolicies, ...unmatchedPolicies]);

    try {
      await setRolePolicies(policyRole.id, policies);
      notifySuccess(t('admin.policySaved'));
      closePolicyModal();
    } catch (error) {
      notifyError(extractApiErrorMessage(error) ?? t('admin.policySaveFailed'));
    }
  };

  return (
    <AdminPage activeKey="roles">
      {loading ? (
        <div className="flex justify-center py-10">
          <Spin size="large" />
        </div>
      ) : (
        <div className="space-y-5">
          <section className="rounded-2xl border border-blue-200/60 bg-white/70 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-sky-900">{t('admin.rolePanelTitle')}</h3>
                <p className="mt-1 text-sm text-slate-500">{t('admin.rolePanelDesc')}</p>
              </div>
              <Button className="ant-surface-btn-primary !h-11" onClick={openCreateRoleModal} type="primary">
                {t('admin.createRoleButton')}
              </Button>
            </div>
          </section>

          <Table
            pagination={false}
            rowKey="id"
            dataSource={roles}
            columns={[
              { title: t('admin.tableCode'), dataIndex: 'name', width: 160 },
              {
                title: t('admin.tableDisplayName'),
                dataIndex: 'display_name'
              },
              {
                title: t('admin.tableDescription'),
                dataIndex: 'description'
              },
              {
                title: t('admin.tableActions'),
                width: 260,
                render: (_: unknown, role: RoleItem) => (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      className="ant-surface-btn-primary !h-9"
                      disabled={isReservedRole(role.name)}
                      onClick={() => openEditRoleModal(role)}
                      type="primary"
                    >
                      {t('admin.editButton')}
                    </Button>
                    <Button
                      className="ant-surface-btn-outline !h-9"
                      disabled={isReservedRole(role.name)}
                      onClick={() => void openPolicies(role)}
                      type="default"
                    >
                      {t('admin.policiesButton')}
                    </Button>
                    <Button className="!h-9" danger disabled={isReservedRole(role.name)} onClick={() => void onDeleteRole(role)} type="default">
                      {t('admin.deleteButton')}
                    </Button>
                  </div>
                )
              }
            ]}
          />
        </div>
      )}

      <Modal
        destroyOnHidden
        open={roleModalOpen}
        confirmLoading={roleModalSubmitting}
        onCancel={closeRoleModal}
        onOk={() => void onCreateRole()}
        okText={editingRole ? t('admin.saveButton') : t('admin.createRoleButton')}
        cancelText={t('admin.cancelButton')}
        title={editingRole ? t('admin.editRoleTitle') : t('admin.createRoleTitle')}
        width={640}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block">
              <span className={formLabelClassName}>{t('admin.tableCode')}</span>
              <Input
                className="ant-surface-input"
                disabled={Boolean(editingRole)}
                placeholder={t('admin.roleCodePlaceholder')}
                value={roleFormData.name}
                onChange={(event) => updateRoleFormData({ name: event.target.value })}
              />
            </label>

            <label className="block">
              <span className={formLabelClassName}>{t('admin.tableDisplayName')}</span>
              <Input
                className="ant-surface-input"
                placeholder={t('admin.roleDisplayNamePlaceholder')}
                value={roleFormData.display_name}
                onChange={(event) => updateRoleFormData({ display_name: event.target.value })}
              />
            </label>
          </div>

          <label className="block">
            <span className={formLabelClassName}>{t('admin.tableDescription')}</span>
            <Input.TextArea
              className="ant-surface-textarea"
              placeholder={t('admin.roleDescPlaceholder')}
              rows={4}
              value={roleFormData.description}
              onChange={(event) => updateRoleFormData({ description: event.target.value })}
            />
          </label>
        </div>
      </Modal>

      <Modal
        open={policyModalOpen}
        onCancel={closePolicyModal}
        onOk={() => void savePolicies()}
        okText={t('admin.confirmButton')}
        cancelText={t('admin.cancelButton')}
        title={t('admin.policyTitle', { name: policyRole?.display_name ?? '' })}
        width={860}
      >
        <p className="py-2 text-sm text-slate-500">{t('admin.policyHint')}</p>
        <div className="max-h-[520px] space-y-4 overflow-y-auto pr-1">
          {policyTemplatesByMenu.map((section) => {
            const selectedCount = section.items.filter((item) => selectedPolicyKeySet.has(item.key)).length;
            const allSelected = section.items.length > 0 && selectedCount === section.items.length;

            return (
              <section key={section.menuKey} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h4 className="text-sm font-semibold text-sky-900">{section.menuLabel}</h4>
                    <Tag color="blue">
                      {selectedCount}/{section.items.length}
                    </Tag>
                  </div>
                  <Button
                    className="ant-surface-btn-outline !h-8 !px-3"
                    onClick={() =>
                      setSelectedPolicyKeys((previous) => {
                        const next = new Set(previous);
                        section.items.forEach((item) => {
                          if (allSelected) {
                            next.delete(item.key);
                          } else {
                            next.add(item.key);
                          }
                        });
                        return Array.from(next);
                      })
                    }
                    type="default"
                  >
                    {allSelected ? t('admin.clearSelection') : t('admin.selectAll')}
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {section.items.map((item) => {
                    const checked = selectedPolicyKeySet.has(item.key);
                    return (
                      <label
                        key={item.key}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition ${
                          checked ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50'
                        }`}
                      >
                        <Checkbox
                          checked={checked}
                          onChange={(event) =>
                            setSelectedPolicyKeys((previous) => {
                              const next = new Set(previous);
                              if (event.target.checked) {
                                next.add(item.key);
                              } else {
                                next.delete(item.key);
                              }
                              return Array.from(next);
                            })
                          }
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-slate-800">{item.actionLabel}</span>
                            <Tag color={getPolicyMethodColor(item.method)}>{item.method}</Tag>
                          </div>
                          {item.description ? <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p> : null}
                          <code className="mt-1 block break-all text-xs text-slate-500">{item.path}</code>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {unmatchedPolicies.length ? (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <h4 className="text-sm font-semibold text-amber-800">{t('admin.policyLegacyTitle')}</h4>
              <p className="mt-1 text-xs leading-6 text-amber-700">{t('admin.policyLegacyHint')}</p>
              <div className="mt-3 space-y-2">
                {unmatchedPolicies.map((policy, index) => (
                  <div key={`${policy.method}-${policy.path}-${index}`} className="rounded-lg border border-amber-200 bg-white px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Tag color={getPolicyMethodColor(policy.method)}>{policy.method}</Tag>
                      <code className="break-all text-xs text-slate-600">{policy.path}</code>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </Modal>
    </AdminPage>
  );
}
