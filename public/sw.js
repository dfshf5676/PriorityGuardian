self.addEventListener('install', (e) => {
    console.log('[Service Worker] O`rnatildi');
});

self.addEventListener('fetch', (e) => {
    // PWA ilova sifatida o'rnatilishiga ruxsat berish uchun bo'sh fetch eventi shart
});
