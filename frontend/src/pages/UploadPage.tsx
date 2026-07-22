import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { uploadFile } from "../api/files";
import { listFolders } from "../api/folders";
import type { FolderItem } from "../api/types";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

const NO_FOLDER = "none";

function UploadPage() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [announcedAt, setAnnouncedAt] = useState("");
  const [folderId, setFolderId] = useState(NO_FOLDER);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    listFolders()
      .then(setFolders)
      .catch(() => setFolders([]));
  }, []);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile) {
      return;
    }
    setIsUploading(true);
    setUploadError(null);
    try {
      await uploadFile(selectedFile, isPublic, {
        folderId: folderId === NO_FOLDER ? null : Number(folderId),
        displayName: displayName.trim() || null,
        announcedAt: announcedAt || null,
      });
      navigate("/");
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : "上傳失敗");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="page">
      <Card>
        <CardContent className="flex flex-col gap-4 text-left">
          <h2>上傳檔案</h2>
          <p className="text-sm text-muted-foreground">
            上傳的檔案會依你設定的可見度顯示在首頁的檔案列表中，上傳後將自動返回首頁。
          </p>
          <form className="flex flex-col gap-4" onSubmit={handleUpload}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="upload">選擇檔案（pdf / doc / xls / docx / xlsx）</Label>
              <Input
                id="upload"
                type="file"
                accept=".pdf,.doc,.xls,.docx,.xlsx"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="display-name">顯示名稱（選填，預設使用檔名）</Label>
              <Input
                id="display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="例如：2026 年度財報"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="folder">卡片分類</Label>
              <Select value={folderId} onValueChange={(value) => value && setFolderId(value)}>
                <SelectTrigger id="folder" className="w-full">
                  <SelectValue>
                    {(value: string) =>
                      value === NO_FOLDER ? "未分類" : (folders.find((f) => String(f.id) === value)?.name ?? "未分類")
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_FOLDER}>未分類</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={String(folder.id)}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="announced-at">公告日期（選填）</Label>
              <Input
                id="announced-at"
                type="date"
                value={announcedAt}
                onChange={(e) => setAnnouncedAt(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="is-public"
                checked={isPublic}
                onCheckedChange={(checked) => setIsPublic(checked === true)}
              />
              <Label htmlFor="is-public">公開（取消勾選則僅本人與管理員可檢視）</Label>
            </div>
            {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
            <Button type="submit" disabled={!selectedFile || isUploading}>
              {isUploading ? "上傳中…" : "上傳"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default UploadPage;
