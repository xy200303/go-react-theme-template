interface Props {
  title: string;
  value: string | number;
  suffix?: string;
}

export default function TechStatCard({ title, value, suffix }: Props) {
  return (
    <article className="tech-card h-full p-5">
      <p className="mb-2 text-sm text-slate-500">{title}</p>
      <p className="text-3xl font-semibold text-blue-600">
        {value}
        {suffix ? <span className="ml-1 text-base text-slate-500">{suffix}</span> : null}
      </p>
    </article>
  );
}
