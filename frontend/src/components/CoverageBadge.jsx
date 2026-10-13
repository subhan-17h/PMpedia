import React from 'react';

export default function CoverageBadge({ coverage }) {
  if (!coverage) return null;

  const { is_sufficient, missing_standards, weak_standards, reason } = coverage;

  let level, icon, label;

  if (is_sufficient) {
    level = 'sufficient';
    icon = '✅';
    label = 'Full Coverage';
  } else if (missing_standards?.length > 0) {
    level = 'insufficient';
    icon = '❌';
    label = `Missing: ${missing_standards.join(', ')}`;
  } else {
    level = 'partial';
    icon = '⚠️';
    label = `Weak: ${weak_standards?.join(', ')}`;
  }

  return (
    <span className={`coverage-badge ${level}`} title={reason || label}>
      {icon} {label}
    </span>
  );
}
