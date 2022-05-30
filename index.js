import prompt from 'prompt';
import fetch from 'node-fetch';
import hawk from 'hawk';
import forge from 'node-forge';
import zip from 'minizip-asm.js';
import fs from 'fs';


(async () => {

    var schema = {
        properties: {
            email: {
                description: 'Email: ',
                required: true
            },
            password: {
                description: 'Password: ',
                required: true,
                hidden: true
            }
        }
    };

    prompt.message = "";
    prompt.delimiter = "";

    prompt.start();

    let {email, password} = await prompt.get(schema);

    let clientId = await fetch('https://www.pearson.it/login/', {
        redirect: 'manual',
    }).then((res)=>{
        return new URL(res.headers.get('location')).searchParams.get('client_id');
    }).catch((err)=>{
        console.log(err);
        process.exit(1);
    });

    let loginRedirect = await fetch(`https://login.pearson.com/v1/piapi/login/oidcauthorize?client_id=${clientId}&redirect_uri=https://reader-prod.gls.pearson-intl.com/bookshelf&nonce=123454321&prompt=login`, {
        redirect: 'manual',
    }).then((res)=>{
        return decodeURI(new URL(res.headers.get('location')).searchParams.get('login_success_url'));
    }).catch((err)=>{
        console.log(err);
        process.exit(1);
    });

    const loginForm = new URLSearchParams();
    loginForm.append('grant_type', 'password');
    loginForm.append('username', email);
    loginForm.append('password', password);
    loginForm.append('client_id', clientId);
    loginForm.append('login_success_url', loginRedirect);

    let token = await fetch('https://login.pearson.com/v1/piapi/login/webcredentials?ts=' + new Date().valueOf(), {
        method: 'POST',
        redirect: 'manual',
        body: loginForm,
    }).then(res=>{
        if (res.status != 200) {
            throw new Error('Login failed');
        }
        return res.json();
    });

    let timestamp = await fetch('https://reader-prod.gls.pearson-intl.com/currentTime').then((res)=>res.text());

    let { header: hawkHeader } = hawk.client.header('https://api-prod.gls.pearson-intl.com/user/session/token', 'POST', {
        credentials: {
            id: 'd5b6fa06-c726-4897-8527-dec9bf2be9ae',
            key: 'b753bcff-005f-4f74-86f5-882a1ce1b812',
            algorithm: 'sha256'
        },
        ext: '',
        timestamp
    });

    let secuirtyToken = await fetch('https://api-prod.gls.pearson-intl.com/user/session/token', {
        method: 'POST',
        headers: {
            'Authorization': hawkHeader,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            firstname: token.data.firstName,
            username: email
        })
    }).then(res=>{
        if (res.status != 200)
            throw new Error('Login failed');
        return res.json();
    }).then(res=>res.token);

    let user = await fetch('https://api-prod.gls.pearson-intl.com/user', {
        headers: {
            'appid': '56dd9b6c1d40e68e859eedb1',
            'token': secuirtyToken,
        }
    }).then(res=>res.json());

    let bookshelf = await fetch(`https://api-prod.gls.pearson-intl.com/user/${user.id}/product`, {
        headers: {
            'appid': '56dd9b6c1d40e68e859eedb1',
            'token': secuirtyToken,
        }
    }).then(res=>res.json());

    if (bookshelf.length == 0) {
        console.log('No books found');
        process.exit(0);
    }
    
    console.log('Bookshelf:');

    bookshelf.forEach((book, i)=>{
        console.log(`${i}) ${book.title}`);
    });

    let { bookId } = await prompt.get({
        properties: {
            bookId: {
                description: 'Book ID [e to exit]: ',
                required: true,
                pattern: /^((\d+)|e)$/,
                message: 'Book ID must be a number',
                conform: (value)=>{
                    return value == 'e' || -1 < parseInt(value) < bookshelf.length;
                }
            }
        }
    });

    if (bookId == 'e') {
        console.log('Good bye!');
        console.log('Consider starring on github: https://github.com/Leone25/reader-plus-downloader');
        process.exit(0);
    }

    let cipher = forge.cipher.createDecipher('AES-CBC', 'sDkjhfkj8yhn8gig');
    cipher.start({iv: forge.util.createBuffer(Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), 'binary')});
    cipher.update(forge.util.createBuffer(Buffer.from(bookshelf[bookId].encpwd, 'base64'), 'binary'));
    cipher.finish();

    //console.log(cipher.output.bytes());

    console.log('Downloading book...');

    let book = await fetch(bookshelf[bookId].epubURL).then(res=>res.arrayBuffer());

    //console.log(book);

    //fs.writeFile("book.zip", Buffer.from(book),  "binary", function(err) { });

    let bookZip = new zip(Buffer.from(book));

    bookZip.list().forEach((file, i, arr)=>{
        let pdf = bookZip.extract(file.filepath, {
            password: cipher.output.bytes()
        });
        fs.writeFileSync(`${bookshelf[bookId].title}${arr.length>1?i:''}.pdf`, pdf, 'binary');
    });

    console.log('Done!');
    console.log('Consider starring on github: https://github.com/Leone25/reader-plus-downloader');
    console.log('Goodbye!');

})();