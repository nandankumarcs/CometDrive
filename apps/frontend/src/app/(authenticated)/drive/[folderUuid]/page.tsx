'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { DriveContent } from '../../../../components/drive/DriveContent';
import { useDriveStore } from '../../../../store/drive.store';
import { useFolderAncestry } from '../../../../hooks/use-folder-ancestry';

export default function FolderPage() {
  const params = useParams();
  const folderUuid = params?.folderUuid as string;
  const { setCurrentFolder, setBreadcrumbs } = useDriveStore();
  const { data: ancestry = [] } = useFolderAncestry(folderUuid);

  useEffect(() => {
    if (folderUuid) {
      setCurrentFolder(folderUuid);
    }
  }, [folderUuid, setCurrentFolder]);

  useEffect(() => {
    if (ancestry.length > 0) {
      const breadcrumbs = [
        { uuid: null, name: 'My Drive' },
        ...ancestry.map((f: any) => ({ uuid: f.uuid, name: f.name })),
      ];
      setBreadcrumbs(breadcrumbs);
    }
  }, [ancestry, setBreadcrumbs]);

  return <DriveContent skipBreadcrumbReset={true} />;
}
