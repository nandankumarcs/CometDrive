import {
  FileText,
  Image,
  Film,
  Music,
  FileSpreadsheet,
  FileCode,
  Archive,
  File,
  Presentation,
} from 'lucide-react';

interface FileIconProps {
  mimeType: string;
  className?: string;
}

const iconMap: Record<string, { icon: typeof File; color: string }> = {
  'image/': { icon: Image, color: 'text-pink-500' },
  'video/': { icon: Film, color: 'text-purple-500' },
  'audio/': { icon: Music, color: 'text-orange-500' },
  'application/pdf': { icon: FileText, color: 'text-red-500' },
  'application/zip': { icon: Archive, color: 'text-yellow-600' },
  'application/x-rar': { icon: Archive, color: 'text-yellow-600' },
  'application/gzip': { icon: Archive, color: 'text-yellow-600' },
  'text/csv': { icon: FileSpreadsheet, color: 'text-green-500' },
  'application/vnd.ms-excel': { icon: FileSpreadsheet, color: 'text-green-600' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml': {
    icon: FileSpreadsheet,
    color: 'text-green-600',
  },
  'application/vnd.ms-powerpoint': { icon: Presentation, color: 'text-orange-600' },
  'application/vnd.openxmlformats-officedocument.presentationml': {
    icon: Presentation,
    color: 'text-orange-600',
  },
  'application/msword': { icon: FileText, color: 'text-blue-600' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml': {
    icon: FileText,
    color: 'text-blue-600',
  },
  'text/html': { icon: FileCode, color: 'text-cyan-500' },
  'text/javascript': { icon: FileCode, color: 'text-yellow-500' },
  'application/json': { icon: FileCode, color: 'text-yellow-500' },
  'text/': { icon: FileText, color: 'text-gray-500' },
};

export function FileIcon({ mimeType, className = 'h-6 w-6' }: FileIconProps) {
  // Try exact match first, then prefix match
  let match = iconMap[mimeType];
  if (!match) {
    const prefix = Object.keys(iconMap).find((key) => mimeType.startsWith(key));
    match = prefix ? iconMap[prefix] : { icon: File, color: 'text-gray-400' };
  }

  const Icon = match.icon;
  return <Icon className={`${className} ${match.color}`} />;
}
