import React from 'react';
import { getCategoryIcon, getCategoryStyle } from '../../utils/categoryMeta';

export default function CategoryBadge({ category, showIcon = true, size = 'md' }) {
  const style = getCategoryStyle(category);
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-medium border ${style.bg} ${style.text} ${style.border} ${sizeClasses}`}
    >
      {showIcon && getCategoryIcon(category, "w-3.5 h-3.5")}
      <span>{category}</span>
    </span>
  );
}
