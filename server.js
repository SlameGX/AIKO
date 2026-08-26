import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import OpenAI from 'openai';
import screenshot from 'screenshot-desktop';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import sharp from 'sharp';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Initialize OpenAI API
const ai = new OpenAI({ 
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: process.env.API_BASE_URL + "/v1" 
});
const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT || "";

wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket.');

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            
            let imgWidth = 1920;
            let imgHeight = 1080;
            
            if (data.type === 'ask_question') {
                const userPrompt = data.prompt;
                console.log('Received prompt:', userPrompt);

                // 1. Prepare initial text-only message
                const messages = [
                    ...(SYSTEM_PROMPT ? [{ role: 'system', content: SYSTEM_PROMPT }] : []),
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ];

                // Define available tools for the AI
                const tools = [
                    {
                        type: "function",
                        function: {
                            name: "send_email",
                            description: "Kullanıcı birine e-posta/mail göndermeni istediğinde bu fonksiyonu kullan. Bu, arka planda n8n üzerinden e-postayı iletir.",
                            parameters: {
                                type: "object",
                                properties: {
                                    to: { type: "string", description: "Alıcının e-posta adresi" },
                                    subject: { type: "string", description: "E-postanın konusu" },
                                    body: { type: "string", description: "E-postanın saf içeriği. İmza (n8n vs) ekleme." }
                                },
                                required: ["to", "subject", "body"]
                            }
                        }
                    }
                ];

                // 2. Call OpenAI API (Text only first)
                let response = await ai.chat.completions.create({
                    model: process.env.MODEL_NAME || 'gemini-3.1-pro',
                    messages: messages,
                    temperature: 0.7,
                    tools: tools
                });

                let aiResponseText = response.choices[0].message.content || "";
                const toolCalls = response.choices[0].message.tool_calls;
                
                // Process tool calls if AI decided to use any
                if (toolCalls && toolCalls.length > 0) {
                    for (const toolCall of toolCalls) {
                        if (toolCall.function.name === 'send_email') {
                            try {
                                const emailData = JSON.parse(toolCall.function.arguments);
                                console.log('AI autonomously decided to send an email:', emailData);
                                
                                fetch("https://n8n.feedagency.dev/webhook/88748273-7f98-4d16-86aa-8014f29fcc6b", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify(emailData)
                                }).then(res => console.log("Email request sent to n8n. Status:", res.status))
                                  .catch(err => console.error("Failed to send email to n8n:", err));
                                  
                                // If the AI didn't provide a text response, set a default one.
                                if (!aiResponseText) {
                                    aiResponseText = "Maili başarıyla gönderdim.";
                                }
                            } catch (e) {
                                console.error('Failed to parse tool arguments:', e);
                            }
                        }
                    }
                }

                // 3. Check if AI wants to see the screen
                if (aiResponseText.includes('[SCREENSHOT_REQUEST]')) {
                    console.log('AI requested a screenshot. Taking screenshot...');
                    ws.send(JSON.stringify({ type: 'status', text: 'Ekrana bakıyor...' }));

                    const imgBuffer = await screenshot({ format: 'png' });
                    
                    // Get original image dimensions for coordinate mapping
                    const metadata = await sharp(imgBuffer).metadata();
                    imgWidth = metadata.width;
                    imgHeight = metadata.height;
                    
                    // Downscale the image to 50% to save API tokens massively
                    const resizedBuffer = await sharp(imgBuffer)
                        .resize({ width: Math.round(imgWidth / 2) })
                        .toBuffer();
                    
                    const base64Image = resizedBuffer.toString('base64');
                    
                    // Add AI's request to history
                    messages.push({ role: 'assistant', content: aiResponseText });
                    
                    // Add image to next user prompt
                    messages.push({
                        role: 'user',
                        content: [
                            { type: 'text', text: 'İşte ekran görüntüsü. Lütfen soruma buna göre cevap ver.' },
                            { type: 'image_url', image_url: { url: `data:image/png;base64,${base64Image}` } }
                        ]
                    });

                    // Call API again with image
                    response = await ai.chat.completions.create({
                        model: process.env.MODEL_NAME || 'gemini-3.1-pro',
                        messages: messages,
                        temperature: 0.7,
                        tools: tools
                    });
                    
                    aiResponseText = response.choices[0].message.content || "";
                    
                    // Also check for tool calls in the second response
                    const toolCalls2 = response.choices[0].message.tool_calls;
                    if (toolCalls2 && toolCalls2.length > 0) {
                        for (const toolCall of toolCalls2) {
                            if (toolCall.function.name === 'send_email') {
                                try {
                                    const emailData = JSON.parse(toolCall.function.arguments);
                                    console.log('AI autonomously decided to send an email (after screenshot):', emailData);
                                    
                                    fetch("https://n8n.feedagency.dev/webhook/88748273-7f98-4d16-86aa-8014f29fcc6b", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify(emailData)
                                    });
                                    if (!aiResponseText) aiResponseText = "Maili gönderdim.";
                                } catch (e) {}
                            }
                        }
                    }
                }

                // Remove the special token just in case it's still there
                aiResponseText = aiResponseText.replace(/\[SCREENSHOT_REQUEST\]/g, '').trim();
                
                // Parse and execute normalized Point requests [POINT:x,y:label]
                const pointMatch = aiResponseText.match(/\[POINT:(\d+),(\d+):(.*?)\]/);
                if (pointMatch) {
                    const normX = parseInt(pointMatch[1], 10);
                    const normY = parseInt(pointMatch[2], 10);
                    
                    // Convert 0-1000 scale to screen coordinates (assuming 1920x1080, getting actual from pureimage)
                    const pixelX = Math.round((normX / 1000) * imgWidth);
                    const pixelY = Math.round((normY / 1000) * imgHeight);

                    console.log(`AI requested to point at normalized ${normX}, ${normY} -> Drawing at pixels ${pixelX}, ${pixelY}`);
                    exec(`DrawCircle.exe ${pixelX} ${pixelY}`, (error) => {
                        if (error) console.error("Error drawing circle:", error);
                    });
                    
                    // Remove the token from the response text
                    aiResponseText = aiResponseText.replace(/\[POINT:\d+,\d+:.*?\]/g, '').trim();
                }

                console.log('AI Response:', aiResponseText);

                // 3. Send response back to frontend
                ws.send(JSON.stringify({
                    type: 'answer',
                    text: aiResponseText
                }));
            }
        } catch (error) {
            console.error('Error processing message:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Bir hata oluştu: ' + error.message
            }));
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected.');
    });
});

server.listen(PORT, () => {
    console.log(`AIKO Server is running on http://localhost:${PORT}`);
});
