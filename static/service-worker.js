const TAG = 'skyputter-notifications';

const isJa = self.navigator.language?.startsWith('ja') ?? true;

function summaryBody(count) {
  return isJa ? `新しい通知が ${count} 件あります` : `${count} new notifications`;
}

async function handlePush(event) {
  const data = event.data?.json() ?? {};
  const url = data.url ?? '/notifications';

  // 表示中の同タグ通知から現在のカウントを取得して加算（集約）
  const existing = await self.registration.getNotifications({ tag: TAG });
  const count = (existing[0]?.data?.count ?? 0) + 1;

  const title = count === 1 ? (data.title ?? 'SkyPutter') : 'SkyPutter';
  const body = count === 1 ? (data.body ?? '') : summaryBody(count);

  const options = {
    body,
    icon: '/skyputter_icon.png',
    badge: '/skyputter_icon_badge.png',
    tag: TAG,
    // renotify 未指定（既定 false）＝同タグ更新は無音。1件目は新規表示なので通常どおり通知される。
    data: { url, count }
  };

  await Promise.all([
    self.registration.showNotification(title, options),
    // アプリ内の自動リロードを駆動。デバイス通知の集約とは独立に毎プッシュ送信する。
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        client.postMessage({ type: 'NEW_NOTIFICATION' });
      }
    })
  ]);
}

self.addEventListener('push', (event) => {
  event.waitUntil(handlePush(event));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/notifications';
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        return clients.openWindow(url);
      })
  );
});
