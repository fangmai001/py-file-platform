function AboutPage() {
  return (
    <div className="page">
      <div className="card">
        <h2>關於本專案</h2>
        <p className="muted">
          py-file-platform 是一個檔案管理／分享平台，定位類似社團或內部團隊的公開文件牆：訪客無需登入即可瀏覽並下載公開檔案，登入後才能上傳與管理自己的檔案。
        </p>
        <p className="muted">
          本專案的主要目的是測試 Python（FastAPI）後端在前後端互動中，處理資料增刪查改（CRUD）與 API 的支援能力。
        </p>

        <h2>已實作功能</h2>
        <ul className="muted">
          <li>本機帳號登入 / JWT 驗證</li>
          <li>檔案上傳、下載，並可設定公開／私密可見度</li>
          <li>檔案版本歷史（同名檔案上傳不覆蓋，保留舊版本）</li>
          <li>資料夾分類瀏覽</li>
          <li>管理員使用者管理</li>
          <li>高權限操作稽核紀錄（Audit Log）</li>
        </ul>

        <h2>尚未實作</h2>
        <ul className="muted">
          <li>LDAP 驗證</li>
          <li>上傳通知（Email / 站內通知）</li>
        </ul>

        <h2>技術棧</h2>
        <p className="muted">FastAPI（後端）＋ React / Vite（前端）＋ PostgreSQL，以 docker-compose 部署。</p>
      </div>
    </div>
  );
}

export default AboutPage;
