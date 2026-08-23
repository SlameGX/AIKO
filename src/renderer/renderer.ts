import './init-pixi';
import { Application } from 'pixi.js';
import { Live2DModel } from 'untitled-pixi-live2d-engine/cubism';

let currentModel: any = null;
let isInteractive = true;
let targetX = 0;
let targetY = 0;
let currentX = 0;
let currentY = 0;
const smoothing = 0.1;

async function bootstrap() {
  const app = new Application();
  await app.init({
    backgroundAlpha: 0,
    resizeTo: window
  });
  
  const appContainer = document.getElementById('app');
  if (appContainer) {
    appContainer.appendChild(app.canvas);
  }

  try {
    const modelUrl = '/AikoModel/AikoModel.model3.json';
    
    currentModel = await Live2DModel.from(modelUrl);
    app.stage.addChild(currentModel);

    // Initial scale and position
    const scaleX = innerWidth / currentModel.width;
    const scaleY = innerHeight / currentModel.height;
    currentModel.scale.set(Math.min(scaleX, scaleY) * 0.8);
    
    currentModel.x = innerWidth / 2 - currentModel.width / 2;
    currentModel.y = innerHeight / 2 - currentModel.height / 2;

  } catch (error) {
    console.error('Failed to load Live2D model:', error);
    const errDiv = document.createElement('div');
    errDiv.style.color = 'red';
    errDiv.style.backgroundColor = 'white';
    errDiv.style.padding = '10px';
    errDiv.textContent = 'Error loading model: ' + String(error);
    document.body.appendChild(errDiv);
  }

  // Handle interaction toggles
  if ((window as any).electronAPI) {
    (window as any).electronAPI.onInteractionToggled((interactive: boolean) => {
      isInteractive = interactive;
      console.log('Interaction mode:', isInteractive);
    });

    window.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (isInteractive) {
        (window as any).electronAPI.showContextMenu();
      }
    });
  }

  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  window.addEventListener('mousedown', (event) => {
    if (!isInteractive || event.button !== 0) return; // Only left click
    isDragging = true;
    dragOffsetX = event.clientX;
    dragOffsetY = event.clientY;
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  window.addEventListener('mousemove', (event) => {
    if (isDragging) {
      if ((window as any).electronAPI) {
        (window as any).electronAPI.moveWindow(event.screenX - dragOffsetX, event.screenY - dragOffsetY);
      }
    }
  });

  if ((window as any).electronAPI) {
    (window as any).electronAPI.onGlobalMouseMove((x: number, y: number) => {
      if (!currentModel || !isInteractive) return;
      targetX = x;
      targetY = y;
    });
  }

  app.ticker.add(() => {
    if (!currentModel) return;

    currentX += (targetX - currentX) * smoothing;
    currentY += (targetY - currentY) * smoothing;

    currentModel.focus(currentX * 1000, currentY * 1000);
  });

  window.addEventListener('resize', () => {
    if (currentModel) {
      currentModel.x = innerWidth / 2 - currentModel.width / 2;
      currentModel.y = innerHeight / 2 - currentModel.height / 2;
    }
  });
}

bootstrap();
