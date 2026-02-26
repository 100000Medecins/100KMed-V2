interface AboutBoxProps {
  children: React.ReactNode;
  contactEmail?: string;
}

export default function AboutBox({ children, contactEmail }: AboutBoxProps) {
  return (
    <aside className="border-l-4 border-accent-orange bg-surface-light rounded-r-2xl p-8 mt-16">
      <h3 className="text-lg font-bold text-accent-orange mb-4">À propos</h3>
      <div className="text-sm text-gray-600 leading-relaxed space-y-3">
        {children}
      </div>
      {contactEmail && (
        <p className="mt-5 text-sm">
          <span className="text-gray-500">Contact presse : </span>
          <a
            href={`mailto:${contactEmail}`}
            className="text-accent-blue underline underline-offset-2 hover:text-navy transition-colors"
          >
            {contactEmail}
          </a>
        </p>
      )}
    </aside>
  );
}
