import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import type { Hotword } from '@/types';

interface HotwordBulkActionsProps {
  hotwords: Hotword[];
  onExport: () => Promise<void>;
  isExporting?: boolean;
}

function HotwordBulkActions({ hotwords, onExport, isExporting = false }: HotwordBulkActionsProps) {
  const handleExportClick = () => {
    void onExport();
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={handleExportClick} disabled={hotwords.length === 0 || isExporting} className="flex items-center gap-2">
        <Download className="h-4 w-4" />
        {isExporting ? '导出中...' : `导出热词 (${hotwords.length})`}
      </Button>
    </div>
  );
}

export default HotwordBulkActions;
