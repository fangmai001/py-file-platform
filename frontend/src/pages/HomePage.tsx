function HomePage() {
  return (
    <div className="page">
      <section className="hero">
        <h1>公開檔案牆</h1>
        <p className="lede">
          瀏覽並下載社團 / 團隊公開的檔案，不需登入即可查看；上傳與管理檔案才需要登入帳號。
        </p>
      </section>

      <section className="card">
        <h2>檔案列表</h2>
        <div className="empty-state">
          <p>尚未串接檔案列表 API</p>
          <p className="muted">之後這裡會顯示可公開下載的檔案，並支援搜尋與分類。</p>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
