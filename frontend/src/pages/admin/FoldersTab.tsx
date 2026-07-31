import { Folder } from "lucide-react";
import Callout from "../../components/Callout";
import EmptyState from "../../components/EmptyState";
import SectionTitle from "../../components/SectionTitle";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import TableSkeleton from "./TableSkeleton";
import type { useFoldersAdmin } from "./useFoldersAdmin";

function FoldersTab(props: ReturnType<typeof useFoldersAdmin>) {
  const {
    folders,
    foldersError,
    folderDrafts,
    setFolderDrafts,
    newFolderName,
    setNewFolderName,
    newFolderDescription,
    setNewFolderDescription,
    isCreatingFolder,
    handleCreateFolder,
    handleSaveFolder,
    handleDeleteFolder,
  } = props;

  return (
    <>
      <Card>
        <CardContent className="flex flex-col gap-4 text-left">
          <SectionTitle>新增卡片</SectionTitle>
          <p className="text-sm text-muted-foreground">卡片用來將首頁的檔案分組呈現，檔案上傳或編輯時可選擇要放入哪張卡片。</p>
          <form className="flex flex-wrap items-end gap-4" onSubmit={handleCreateFolder}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-folder-name">名稱</Label>
              <Input
                id="new-folder-name"
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-folder-description">描述</Label>
              <Input
                id="new-folder-description"
                type="text"
                value={newFolderDescription}
                onChange={(e) => setNewFolderDescription(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={isCreatingFolder}>
              {isCreatingFolder ? "建立中…" : "新增"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 text-left">
          <SectionTitle>卡片列表</SectionTitle>
          <Callout>{foldersError}</Callout>
          {folders === null && !foldersError && <TableSkeleton />}
          {folders !== null && folders.length === 0 && (
            <EmptyState icon={Folder} title="目前沒有卡片" />
          )}
          {folders !== null && folders.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名稱</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {folders.map((folder) => (
                  <TableRow key={folder.id}>
                    <TableCell>
                      <Input
                        type="text"
                        value={folderDrafts[folder.id]?.name ?? ""}
                        onChange={(e) =>
                          setFolderDrafts((drafts) => ({
                            ...drafts,
                            [folder.id]: { ...drafts[folder.id], name: e.target.value },
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={folderDrafts[folder.id]?.description ?? ""}
                        onChange={(e) =>
                          setFolderDrafts((drafts) => ({
                            ...drafts,
                            [folder.id]: { ...drafts[folder.id], description: e.target.value },
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleSaveFolder(folder)}>
                          儲存
                        </Button>
                        <Button variant="destructive-outline" size="sm" onClick={() => handleDeleteFolder(folder)}>
                          刪除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

export default FoldersTab;
