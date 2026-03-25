import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Menu, type MenuProps } from 'antd';

export interface SidebarLayoutItem<T extends string> {
  key: T | string;
  label: string;
  icon?: ReactNode;
  children?: SidebarLayoutItem<T>[];
}

interface SidebarLayoutProps<T extends string> {
  title?: string;
  items: SidebarLayoutItem<T>[];
  activeKey: T;
  onChange: (key: T) => void;
  collapsed: boolean;
  onToggle: () => void;
  collapseLabel: string;
  expandLabel: string;
  children: ReactNode;
}

function collectLeafKeys<T extends string>(items: SidebarLayoutItem<T>[], result = new Set<string>()) {
  items.forEach((item) => {
    if (item.children?.length) {
      collectLeafKeys(item.children, result);
      return;
    }
    result.add(String(item.key));
  });
  return result;
}

function findActivePath<T extends string>(items: SidebarLayoutItem<T>[], targetKey: string, parentKeys: string[] = []): string[] {
  for (const item of items) {
    const currentKey = String(item.key);
    if (currentKey === targetKey) {
      return [...parentKeys, currentKey];
    }

    if (item.children?.length) {
      const childPath = findActivePath(item.children, targetKey, [...parentKeys, currentKey]);
      if (childPath.length) {
        return childPath;
      }
    }
  }

  return [];
}

function toMenuItems<T extends string>(items: SidebarLayoutItem<T>[]): NonNullable<MenuProps['items']> {
  return items.map((item) => {
    const icon = item.icon ? <span className="sidebar-menu-icon">{item.icon}</span> : undefined;

    if (item.children?.length) {
      return {
        key: String(item.key),
        icon,
        label: item.label,
        children: toMenuItems(item.children)
      };
    }

    return {
      key: String(item.key),
      icon,
      label: item.label
    };
  });
}

export default function SidebarLayout<T extends string>({
  title,
  items,
  activeKey,
  onChange,
  collapsed,
  onToggle,
  collapseLabel,
  expandLabel,
  children
}: SidebarLayoutProps<T>) {
  const targetKey = String(activeKey);
  const leafKeys = useMemo(() => collectLeafKeys(items), [items]);
  const activePath = useMemo(() => findActivePath(items, targetKey), [items, targetKey]);
  const menuItems = useMemo(() => toMenuItems(items), [items]);
  const [openKeys, setOpenKeys] = useState<string[]>(activePath.slice(0, -1));
  const layoutStyle = {
    '--sidebar-grid-columns': collapsed ? '92px minmax(0, 1fr)' : '272px minmax(0, 1fr)'
  } as CSSProperties;

  useEffect(() => {
    if (!collapsed) {
      setOpenKeys(activePath.slice(0, -1));
    }
  }, [activePath, collapsed]);

  return (
    <div
      className="sidebar-layout sidebar-layout--traditional mx-auto grid w-[96%] min-w-0 gap-4"
      data-collapsed={collapsed ? 'true' : 'false'}
      style={layoutStyle}
    >
      <aside className={`tech-card sidebar-shell sidebar-shell--traditional min-w-0 ${collapsed ? 'sidebar-shell--collapsed' : ''}`}>
        <div className="sidebar-shell__header">
          <div className={`sidebar-shell__title-wrap ${collapsed ? 'sidebar-shell__title-wrap--hidden' : ''}`} aria-hidden={collapsed}>
            <div className="sidebar-shell__title sidebar-shell__title--centered">{title}</div>
          </div>
          <button
            className={`sidebar-shell__trigger ${collapsed ? 'sidebar-shell__trigger--collapsed' : ''}`}
            onClick={onToggle}
            type="button"
            aria-label={collapsed ? expandLabel : collapseLabel}
          >
            <svg className={`sidebar-toggle__icon ${collapsed ? 'sidebar-toggle__icon--collapsed' : ''}`} viewBox="0 0 20 20" aria-hidden="true">
              <path
                d="M12.8 4.1a1 1 0 0 1 0 1.41L8.31 10l4.49 4.49a1 1 0 1 1-1.41 1.41l-5.2-5.2a1 1 0 0 1 0-1.41l5.2-5.2a1 1 0 0 1 1.41 0Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>

        <div className="sidebar-shell__body">
          <Menu
            className="sidebar-menu"
            items={menuItems}
            mode="inline"
            inlineCollapsed={collapsed}
            selectedKeys={[targetKey]}
            openKeys={collapsed ? [] : openKeys}
            onOpenChange={(keys) => setOpenKeys(keys as string[])}
            onClick={({ key }) => {
              const nextKey = String(key);
              if (leafKeys.has(nextKey)) {
                onChange(nextKey as T);
              }
            }}
          />
        </div>
      </aside>

      <section className="tech-card sidebar-content min-w-0 p-6">{children}</section>
    </div>
  );
}
