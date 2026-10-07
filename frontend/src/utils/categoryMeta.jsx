import React from 'react';
import {
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Code,
  Sheet,
  Presentation,
  File
} from 'lucide-react';

export const CATEGORY_COLORS = {
  PDFs: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-500',
    hex: '#ef4444',
  },
  Documents: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
    hex: '#3b82f6',
  },
  Spreadsheets: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    hex: '#10b981',
  },
  Presentations: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    hex: '#f59e0b',
  },
  Images: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
    hex: '#8b5cf6',
  },
  Videos: {
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
    dot: 'bg-cyan-500',
    hex: '#06b6d4',
  },
  Audio: {
    bg: 'bg-pink-50',
    text: 'text-pink-700',
    border: 'border-pink-200',
    dot: 'bg-pink-500',
    hex: '#ec4899',
  },
  Archives: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    dot: 'bg-orange-500',
    hex: '#f97316',
  },
  Code: {
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
    dot: 'bg-teal-500',
    hex: '#0d9488',
  },
  Others: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dot: 'bg-slate-500',
    hex: '#64748b',
  },
};

export function getCategoryIcon(category, className = "w-4 h-4") {
  switch (category) {
    case 'PDFs':
      return <FileText className={className} />;
    case 'Documents':
      return <FileText className={className} />;
    case 'Spreadsheets':
      return <Sheet className={className} />;
    case 'Presentations':
      return <Presentation className={className} />;
    case 'Images':
      return <Image className={className} />;
    case 'Videos':
      return <Video className={className} />;
    case 'Audio':
      return <Music className={className} />;
    case 'Archives':
      return <Archive className={className} />;
    case 'Code':
      return <Code className={className} />;
    default:
      return <File className={className} />;
  }
}

export function getCategoryStyle(category) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.Others;
}
