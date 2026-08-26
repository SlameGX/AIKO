import fs from 'fs';
import * as PImage from 'pureimage';
import { Readable } from 'stream';
import screenshot from 'screenshot-desktop';

async function testGrid() {
    console.log("Taking screenshot...");
    const imgBuffer = await screenshot({ format: 'png' });
    
    // Create a readable stream from buffer
    const stream = new Readable();
    stream.push(imgBuffer);
    stream.push(null);

    console.log("Decoding PNG...");
    const img = await PImage.decodePNGFromStream(stream);
    console.log(`Image size: ${img.width}x${img.height}`);
    
    // Use PImage context
    const ctx = img.getContext('2d');
    
    // Load font
    const fnt = PImage.registerFont('C:/Windows/Fonts/arial.ttf', 'Arial');
    await fnt.load();
    ctx.font = '20pt Arial';
    ctx.fillStyle = 'rgba(255,255,0,1)';
    ctx.strokeStyle = 'rgba(255,0,0,0.5)';
    ctx.lineWidth = 2;
    
    for (let x = 0; x < img.width; x += 100) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, img.height);
        ctx.stroke();
        ctx.fillText(x.toString(), x + 5, 25);
    }
    
    for (let y = 0; y < img.height; y += 100) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(img.width, y);
        ctx.stroke();
        if (y > 0) ctx.fillText(y.toString(), 5, y + 25);
    }
    
    console.log("Encoding output to memory buffer...");
    const { PassThrough } = await import('stream');
    const passThrough = new PassThrough();
    const chunks = [];
    passThrough.on('data', chunk => chunks.push(chunk));
    
    await PImage.encodePNGToStream(img, passThrough);
    const outBuffer = Buffer.concat(chunks);
    console.log("Base64 Length:", outBuffer.toString('base64').length);
    console.log("Done");
}

testGrid().catch(console.error);
