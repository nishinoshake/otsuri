if ('serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .catch(error => console.error('オフライン用ファイルを保存できませんでした。オンラインで再読み込みしてください。', error));
  });
}
