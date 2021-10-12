# Reader+ downloader
Download your Pearson books from Reader+ into an offline PDF.

## How to use

1. Download this repo, unzip the download, open a terminal, navigate to the extracted files and type:
```shell
npm i
```
2. Run the script with node
```shell
node index.js
```
3. Open your book in the web browser and open the inspect tools (F12 or CTRL + SHIFT + I), and go to the "network" tab and enable the `fetch/XHR` filter and make sure that `disable cache` is enabled
4. Look in the requests and look for the one that only says `page0`(must be nothing else, only that), if there are multiple, any will do, and copy the request url in the terminal making sure to remove the `0` and press enter. It should look something like this
```
https://**************.cloudfront.net/resources/products/epubs/generated/********-****-****-****-************/foxit-assets/pages/page
```
~~5. Scroll down in the request information and look for the `token`, copy and paste that in the terminal and press enter~~
6. Right above the `page0` request there should be a `************************.json`, click on that, look at its content, scroll down to the bottom and input in the terminal the largest number you see on the left side
7. The script will now start downloading your book, it may take a bit of time depending on the speed of your machine and connection
8. Once done downloading it will ask for a file name, provide one with no special charaters or file extentions and press enter
9. You are done! Enjoy your book!

## Disclaimer

Remember that you are responsible for what you are doing on the internet and even tho this script exists it might not be legal in your country to create personal backups of books.

I may or may not update this script depending on my needs, but I'm open to pull requests ecc.

## License

This software uses the MIT License

