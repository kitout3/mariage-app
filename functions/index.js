const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();

exports.notifyNewPendingVideo = onDocumentCreated(
  { document: 'videoTestimonials/{videoId}', region: 'europe-west1' },
  async event => {
    const video = event.data?.data();
    if (!video || video.status !== 'pending') return;

    const db = getFirestore();
    const subscriptions = await db.collection('pushSubscriptions')
      .where('enabled', '==', true)
      .get();

    const tokens = subscriptions.docs.map(doc => doc.data().token).filter(Boolean);
    if (!tokens.length) return;

    const author = video.author ? ` de ${video.author}` : '';
    const response = await getMessaging().sendEachForMulticast({
      tokens,
      notification: {
        title: '🎥 Nouvelle vidéo à valider',
        body: `Une nouvelle vidéo${author} attend votre validation.`
      },
      data: {
        url: 'https://kitout3.github.io/mariage-app/#admin',
        videoId: event.params.videoId
      },
      webpush: {
        fcmOptions: { link: 'https://kitout3.github.io/mariage-app/#admin' }
      }
    });

    const removals = [];
    response.responses.forEach((result, index) => {
      if (!result.success && ['messaging/registration-token-not-registered','messaging/invalid-registration-token'].includes(result.error?.code)) {
        removals.push(db.collection('pushSubscriptions').doc(tokens[index]).delete());
      }
    });
    await Promise.all(removals);
    await event.data.ref.update({ notificationSentAt: FieldValue.serverTimestamp() });
  }
);
