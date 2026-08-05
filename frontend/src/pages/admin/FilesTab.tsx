import { FileText } from "lucide-react";
import Callout from "../../components/Callout";
import EmptyState from "../../components/EmptyState";
import SectionTitle from "../../components/SectionTitle";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import TableSkeleton from "./TableSkeleton";
import type { useFilesAdmin } from "./useFilesAdmin";

function FilesTab(props: ReturnType<typeof useFilesAdmin>) {
  const { fileGroups, filesError, fileFilter, setFileFilter, totalFiles, filteredFiles, handleDeleteFile } = props;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 text-left">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SectionTitle>所有檔案</SectionTitle>
          <Input
            type="search"
            placeholder="依檔名搜尋…"
            className="w-56"
            value={fileFilter}
            onChange={(e) => setFileFilter(e.target.value)}
            aria-label="依檔名搜尋檔案"
          />
        </div>
        <Callout>{filesError}</Callout>
        {fileGroups === null && !filesError && <TableSkeleton />}
        {filteredFiles !== null && filteredFiles.length === 0 && (
          <EmptyState icon={FileText} title={totalFiles !== null && totalFiles > 0 ? "沒有符合條件的檔案" : "目前沒有檔案"} />
        )}
        {filteredFiles !== null && filteredFiles.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>檔名</TableHead>
                <TableHead>顯示名稱</TableHead>
                <TableHead>資料夾</TableHead>
                <TableHead>公告日期</TableHead>
                <TableHead>擁有者 ID</TableHead>
                <TableHead>可見度</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFiles.map(({ file, folderName }) => (
                <TableRow key={file.id}>
                  <TableCell>{file.filename}</TableCell>
                  <TableCell>{file.display_name ?? "—"}</TableCell>
                  <TableCell>{folderName}</TableCell>
                  <TableCell className="whitespace-nowrap">{file.announced_at ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">{file.owner_id}</TableCell>
                  <TableCell>
                    <Badge variant={file.is_public ? "success" : "secondary"}>
                      {file.is_public ? "公開" : "私密"}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Button variant="destructive-outline" size="sm" onClick={() => handleDeleteFile(file)}>
                      刪除
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default FilesTab;
