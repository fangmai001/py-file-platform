import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, UploadCloud } from "lucide-react";
import { ApiError } from "../api/client";
import { uploadFile } from "../api/files";
import { listFolders } from "../api/folders";
import type { FolderItem } from "../api/types";
import Callout from "../components/Callout";
import PageHeader from "../components/PageHeader";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useSiteSettings } from "../context/SiteSettingsContext";
import { formatSize } from "../lib/format";

const NO_FOLDER = "none";

function UploadPage() {
  const navigate = useNavigate();
  const { maxUploadSizeMb } = useSiteSettings();
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

  // 在這裡就檢查而不是只在送出時檢查，讓過大的檔案在選取當下就被拒絕，
  // 而不是等瀏覽器把它整個上傳完，才換來一個 413。
  function handleFileChange(file: File | null) {
    if (file && file.size > maxUploadSizeMb * 1024 * 1024) {
      setSelectedFile(null);
      setUploadError(`檔案超過大小上限（${maxUploadSizeMb} MB）`);
      return;
    }
    setSelectedFile(file);
    setUploadError(null);
  }

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
      <PageHeader
        title="上傳檔案"
        description="上傳的檔案會依你設定的可見度顯示在首頁的檔案列表中，上傳後將自動返回首頁。"
      />
      <Card size="lg" className="max-w-2xl">
        <CardContent className="flex flex-col gap-4 text-left">
          <form className="flex max-w-md flex-col gap-4" onSubmit={handleUpload}>
            <div className="flex flex-col gap-2">
              {/* file input 留在它的 <label> 裡面、只用 sr-only 隱藏，這樣 label 的關聯
                  （以及 getByLabelText）仍然有效，同時 label 本身就成為拖放目標。
                  label 的文字內容請維持在這一行內、含上限說明——多出來的文字節點
                  會改變它的 accessible name。 */}
              <Label
                htmlFor="upload"
                className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-input bg-muted/30 px-6 py-10 text-center font-normal transition-colors hover:border-primary/50 hover:bg-accent/40 has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-3 has-[input:focus-visible]:ring-ring/50"
              >
                <UploadCloud className="size-6 text-muted-foreground" />
                選擇檔案（pdf / doc / xls / docx / xlsx，單檔上限 {maxUploadSizeMb} MB）
                <Input
                  id="upload"
                  type="file"
                  accept=".pdf,.doc,.xls,.docx,.xlsx"
                  className="sr-only"
                  onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                />
              </Label>
              {selectedFile && (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {selectedFile.name}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {formatSize(selectedFile.size)}
                  </span>
                </div>
              )}
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
              <Label htmlFor="folder">資料夾</Label>
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
            <Callout>{uploadError}</Callout>
            <Button type="submit" size="lg" className="self-start" disabled={!selectedFile || isUploading}>
              {isUploading ? "上傳中…" : "上傳"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default UploadPage;
