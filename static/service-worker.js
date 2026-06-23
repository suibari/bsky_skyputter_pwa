const TAG = 'skyputter-notifications';
const NOTIF_PREFIX = 'skyputter-notif-';
const MAX_INDIVIDUAL = 5;

const isJa = self.navigator.language?.startsWith('ja') ?? true;

function summaryBody(count) {
  return isJa ? `新しい通知が ${count} 件あります` : `${count} new notifications`;
}

async function handlePush(event) {
  const data = event.data?.json() ?? {};
  const url = data.url ?? '/notifications';

  // 表示中の全通知からカウントを取得して加算
  const allNotifs = await self.registration.getNotifications();
  let prevCount = allNotifs.reduce((max, n) => Math.max(max, n.data?.count ?? 0), 0);
  if (prevCount === 0) prevCount = allNotifs.length;
  const count = prevCount + 1;

  let title, body, tag;

  if (count <= MAX_INDIVIDUAL) {
    // 5件以下は個別表示（それぞれ異なるタグで積み重ねる）
    title = data.title ?? 'SkyPutter';
    body = data.body ?? '';
    tag = NOTIF_PREFIX + count;
  } else {
    // 6件目以降は既存通知を全て閉じてまとめ表示
    allNotifs.forEach((n) => n.close());
    title = 'SkyPutter';
    body = summaryBody(count);
    tag = TAG;
  }

  const options = {
    body,
    icon: '/skyputter_icon.png',
    badge: '/skyputter_icon_badge.png',
    tag,
    // renotify 未指定（既定 false）＝同タグ更新は無音。個別通知は新規タグなので通常どおり通知される。
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
