import fs from 'fs';
import hawk from 'hawk';
import zip from 'minizip-asm.js';
import fetch from 'node-fetch';
import forge from 'node-forge';
import prompt from 'prompt';

const schema = {
  properties: {
    email: {
      description: 'Email/Username:',
      required: true,
    },
    password: {
      description: 'Password:',
      required: true,
      hidden: true,
    },
  },
};

prompt.message = '';
prompt.delimiter = '';

prompt.start();

(async () => {
  const { email, password } = await prompt.get(schema);

  const clientId = await fetch('https://www.pearson.it/login/', {
    redirect: 'manual',
  })
    .then((res) => {
      return new URL(res.headers.get('location')).searchParams.get('client_id');
    })
    .catch((err) => {
      console.log(err);
      process.exit(1);
    });

  const loginRedirect = await fetch(
    `https://login.pearson.com/v1/piapi/login/oidcauthorize?client_id=${clientId}&redirect_uri=https://reader-prod.gls.pearson-intl.com/bookshelf&nonce=123454321&prompt=login`,
    {
      redirect: 'manual',
    },
  )
    .then((res) => {
      return decodeURI(new URL(res.headers.get('location')).searchParams.get('login_success_url'));
    })
    .catch((err) => {
      console.log(err);
      process.exit(1);
    });

  const iesCode = new URL(loginRedirect).searchParams.get('iesCode');

  const loginForm = new URLSearchParams();
  loginForm.append('grant_type', 'password');
  loginForm.append('username', email);
  loginForm.append('password', password);
  loginForm.append('client_id', clientId);
  loginForm.append('login_success_url', loginRedirect);

  const token = await fetch(
    'https://login.pearson.com/v1/piapi/login/webcredentials?ts=' + new Date().valueOf(),
    {
      method: 'POST',
      redirect: 'manual',
      body: loginForm,
    },
  ).then((res) => {
    if (res.status != 200) {
      throw new Error('Login failed');
    }
    return res.json();
  });

  const credentails = await fetch(
    `https://login.pearson.com/v1/piapi/login/oidctoken?client_id=${clientId}&redirect_uri=undefined&grant_type=authorization_code&iesCode=${iesCode}`,
    {
      method: 'POST',
    },
  ).then((res) => {
    if (res.status != 200) throw new Error('Login failed');
    return res.json();
  });

  const timestamp = await fetch('https://reader-prod.gls.pearson-intl.com/currentTime').then(
    (res) => res.text(),
  );

  const { header: hawkHeader } = hawk.client.header(
    'https://api-prod.gls.pearson-intl.com/user/session/token',
    'POST',
    {
      credentials: {
        id: 'd5b6fa06-c726-4897-8527-dec9bf2be9ae',
        key: 'b753bcff-005f-4f74-86f5-882a1ce1b812',
        algorithm: 'sha256',
      },
      ext: '',
      timestamp,
    },
  );

  const secuirtyToken = await fetch('https://api-prod.gls.pearson-intl.com/user/session/token', {
    method: 'POST',
    headers: {
      Authorization: hawkHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      firstname: token.data.firstName,
      username: email,
    }),
  })
    .then((res) => {
      if (res.status != 200) throw new Error('Login failed');
      return res.json();
    })
    .then((res) => res.token);

  const user = await fetch('https://api-prod.gls.pearson-intl.com/user', {
    headers: {
      appid: '56dd9b6c1d40e68e859eedb1',
      token: secuirtyToken,
    },
  }).then((res) => res.json());

  const booklist = [];

  const bookshelf = await fetch(`https://api-prod.gls.pearson-intl.com/user/${user.id}/product`, {
    headers: {
      appid: '56dd9b6c1d40e68e859eedb1',
      token: secuirtyToken,
    },
  }).then((res) => res.json());

  bookshelf.forEach((book) => {
    booklist.push({
      type: 'pdf',
      title: book.title,
      url: book.epubURL,
      encpwd: book.encpwd,
    });
  });

  const eTextBookshelf = await fetch(
    'https://stpaperapi.prd-prsn.com/etext/v2/courseboot/convergedreader/compositeBookShelf/',
    {
      headers: {
        'x-authorization': credentails.data.access_token,
      },
    },
  ).then((res) => res.json());

  eTextBookshelf.entries.forEach((book) => {
    booklist.push({
      type: 'etext',
      title: book.title,
      url: book.uPdfUrl,
    });
  });

  if (booklist.length == 0) {
    console.log('No books found');
    process.exit(0);
  }

  console.log('Bookshelf:');

  booklist.forEach((book, i) => {
    console.log(`[${book.type.toUpperCase()}]\t ${i}) ${book.title}`);
  });

  const { bookId } = await prompt.get({
    properties: {
      bookId: {
        description: 'Book ID [e to exit]: ',
        required: true,
        pattern: /^((\d+)|e)$/,
        message: 'Book ID must be a number',
        conform: (value) => {
          return value == 'e' || -1 < parseInt(value) < booklist.length;
        },
      },
    },
  });

  if (bookId == 'e') {
    console.log('Good bye!');
    console.log('Consider starring on github: https://github.com/Leone25/reader-plus-downloader');
    process.exit(0);
  }

  if (booklist[bookId].type == 'pdf') {
    const cipher = forge.cipher.createDecipher('AES-CBC', 'sDkjhfkj8yhn8gig');
    cipher.start({
      iv: forge.util.createBuffer(
        Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
        'binary',
      ),
    });
    cipher.update(
      forge.util.createBuffer(Buffer.from(bookshelf[bookId].encpwd, 'base64'), 'binary'),
    );
    cipher.finish();

    console.log('Downloading book...');

    const book = await fetch(bookshelf[bookId].epubURL).then((res) => res.arrayBuffer());

    const bookZip = new zip(Buffer.from(book));

    bookZip.list().forEach((file, i, arr) => {
      const pdf = bookZip.extract(file.filepath, {
        password: cipher.output.bytes(),
      });
      fs.writeFileSync(`${bookshelf[bookId].title}${arr.length > 1 ? i : ''}.pdf`, pdf, 'binary');
    });
  } else if (booklist[bookId].type == 'etext') {
    console.log('Downloading book...');

    const cdnToken = await fetch(
      'https://etext.pearson.com/api/nextext-api/v1/api/nextext/eps/authtoken',
      {
        headers: {
          'x-authorization': credentails.data.access_token,
        },
      },
    ).then((res) => res.json());

    const book = await fetch(booklist[bookId].url, {
      headers: {
        [cdnToken.name]: cdnToken.value,
      },
    }).then((res) => res.arrayBuffer());

    fs.writeFileSync(`${booklist[bookId].title}.pdf`, Buffer.from(book), 'binary');
  } else {
    console.log("Welp, this wasn't supposed to happen :L");
  }

  console.log('Done!');
  console.log('Consider starring on github: https://github.com/Leone25/reader-plus-downloader');
  console.log('Good bye!');
})();
