# Reader+ downloader
Download your Pearson books from Reader+ into an offline PDF.

**NOW WITH SUPPORT FOR BOTH PDFS AND ETEXT!!!**

## How to use

1. Download this repo, unzip the download, open a terminal, navigate to the extracted files and type:
```shell
npm i
```
2. Run the script with node
```shell
node index.js
```
3. Enter your username and password (the field will look as if you are typing nothing but that's just for privacy)
4. Select the book you wish to download from the list
5. Wait.
6. You are done! Enjoy your book!

### Issues
We had reports of users unable to open some PDFs obtained trought this script; we are aware of it and unfortunately there is not much we can do about it now. This is due to the 1000+1 formats reader plus uses to deliver its books. For those interested, this kind of file are actually weirdly formatted epubs, so the downloaded file is actually a zip and can be confirmed by changing the extension of the file to .zip and opening it with the file exporer. If that doesn't not work it might be that a new formt has yet been implemented, so please let us know with an issue here on github so that we can contact you more privately. Some day we will write a converter for this files too, since so far we had no luck finding one already made on the internet, although if you wish to take on the challange feel free to do so, and if anything comes out of it make sure to let us know.

## Disclaimer

Remember that you are responsible for what you are doing on the internet and even tho this script exists it might not be legal in your country to create personal backups of books.

I may or may not update this script depending on my needs, but I'm open to pull requests ecc.

## License

This software uses the MIT License

