self.addEventListener(
  'message',
  ($message) => {
    const datas = [];

    const progressStep = $message.data.nbOfLines / 1000; // update progress bar every 0.1%
    let i = 0;
    let j;
    for (; i < $message.data.nbOfLines; i++) {
      j = 0;
      datas.push([]);
      for (; j < $message.data.nbOfColumns; j++) {
        datas[i].push(generateRandomData());
      }
      if (i > 0 && (i % progressStep) === 0) {
        const progress = i / $message.data.nbOfLines * 100;
        postMessage({context: 'update', progress: progress});
      }
    }

    postMessage({context: 'done', result: datas});
  }
);

const generateRandomData = () => {
  let text = '';
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charsetLength = charset.length;

  let i = 0;
  for (; i < 10; i++) {
    text += charset[Math.floor(Math.random() * charsetLength)];
  }

  return text;
};
