// One titled block inside the Settings dialog.
export default function SettingsSection({ icon: Icon, title, description, children }) {
  return (
    <section className="border-t border-line py-5 first:border-t-0 first:pt-0">
      <div className="mb-4 flex items-start gap-3">
        {Icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-subtle">
            <Icon className="h-4 w-4 text-muted" />
          </span>
        )}
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
