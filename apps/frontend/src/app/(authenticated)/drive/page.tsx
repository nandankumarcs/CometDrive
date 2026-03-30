'use client';

import { DriveContent } from '../../../components/drive/DriveContent';

export default function DrivePage() {
  return (
    <div className="flex h-full">
      <div className="flex-1 min-w-0">
        <DriveContent />
      </div>
    </div>
  );
}
