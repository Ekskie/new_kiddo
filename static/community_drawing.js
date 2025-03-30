document.addEventListener('DOMContentLoaded', function() {
    // Initialize Feather Icons
    lucide.createIcons();
    
    // Canvas setup
    const canvas = document.getElementById('drawing-canvas');
    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let lastPoint = null;
    
    // Tool state
    const state = {
      brushColor: '#000000',
      brushSize: 10,
      brushType: 'round',
      smoothingLevel: 5,
      activeTool: 'brush'
    };
    
    // DOM Elements
    const brushTypeSelect = document.getElementById('brush-type');
    const currentColorSwatch = document.getElementById('current-color');
    const colorPalette = document.getElementById('color-palette');
    const customColorInput = document.getElementById('custom-color');
    const smoothingSlider = document.getElementById('smoothing-slider');
    const smoothingValue = document.getElementById('smoothing-value');
    const sizeSlider = document.getElementById('size-slider');
    const sizeValue = document.getElementById('size-value');
    const brushPreview = document.getElementById('brush-preview');
    const brushTool = document.getElementById('brush-tool');
    const eraserTool = document.getElementById('eraser-tool');
    const clearCanvasBtn = document.getElementById('clear-canvas');
    const clearCanvasFooter = document.getElementById('clear-footer');
    const saveBtn = document.getElementById('save-btn');
    const saveFooter = document.getElementById('save-footer');
    const shareBtn = document.getElementById('share-btn');
    const backBtn = document.getElementById('back-btn');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    
    // Set initial canvas size
    function resizeCanvas() {
      const container = canvas.parentElement;
      const rect = container.getBoundingClientRect();
      
      // Set display size (css pixels)
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      
      // Set actual size in memory (scaled for retina displays)
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      // Scale context according to retina display
      ctx.scale(dpr, dpr);
      
      // Fill with white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Reset brush settings after resize
      updateBrushSettings();
    }
    
    // Initialize canvas
    function initCanvas() {
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
      
      // Fill with white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Set initial brush settings
      updateBrushSettings();
    }
    
    // Update brush settings
    function updateBrushSettings() {
      ctx.strokeStyle = state.brushColor;
      ctx.lineWidth = state.brushSize;
      ctx.lineCap = state.brushType === 'round' ? 'round' : 'square';
      ctx.lineJoin = 'round';
      
      // Update UI to reflect current settings
      currentColorSwatch.style.backgroundColor = state.brushColor;
      customColorInput.value = state.brushColor;
      brushPreview.style.backgroundColor = state.brushColor;
      brushPreview.style.width = Math.min(state.brushSize, 20) + 'px';
      brushPreview.style.height = Math.min(state.brushSize, 20) + 'px';
    }
    
    // Drawing functions
    function startDrawing(e) {
      e.preventDefault();
      isDrawing = true;
      
      const { x, y } = getPointerPosition(e);
      lastPoint = { x, y };
      
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    
    function draw(e) {
      if (!isDrawing || !lastPoint) return;
      e.preventDefault();
      
      const { x, y } = getPointerPosition(e);
      
      if (state.smoothingLevel > 0) {
        applySmoothingToLine(lastPoint, { x, y });
      } else {
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      
      lastPoint = { x, y };
    }
    
    function stopDrawing() {
      isDrawing = false;
      lastPoint = null;
    }
    
    // Apply smoothing using quadratic curves
    function applySmoothingToLine(startPoint, endPoint) {
      // Calculate control points (basic smoothing)
      const controlPoint = {
        x: (lastPoint.x + endPoint.x) / 2,
        y: (lastPoint.y + endPoint.y) / 2
      };
      
      // Apply smoothing based on level (1-10)
      const smoothingFactor = state.smoothingLevel / 10;
      const smoothedControlPoint = {
        x: controlPoint.x * smoothingFactor + lastPoint.x * (1 - smoothingFactor),
        y: controlPoint.y * smoothingFactor + lastPoint.y * (1 - smoothingFactor)
      };
      
      // Draw the smooth curve
      ctx.beginPath();
      ctx.moveTo(startPoint.x, startPoint.y);
      ctx.quadraticCurveTo(
        smoothedControlPoint.x, 
        smoothedControlPoint.y, 
        endPoint.x, 
        endPoint.y
      );
      ctx.stroke();
    }
    
    // Helper to get pointer position (handles both mouse and touch)
    function getPointerPosition(e) {
      const rect = canvas.getBoundingClientRect();
      
      if (e.touches) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top
        };
      } else {
        return {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
      }
    }
    
    // Clear canvas
    function clearCanvas() {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      showToast('Canvas cleared');
    }
    
    // Save drawing to device
    function saveDrawing() {
      const link = document.createElement('a');
      link.download = `drawing-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      showToast('Drawing saved to your device');
    }
    
    // Set active tool
    function setActiveTool(tool) {
      state.activeTool = tool;
      
      // Update UI
      if (tool === 'brush') {
        brushTool.classList.add('active');
        eraserTool.classList.remove('active');
        // Restore previous color
        state.brushColor = customColorInput.value;
      } else if (tool === 'eraser') {
        brushTool.classList.remove('active');
        eraserTool.classList.add('active');
        // Set eraser to white
        state.brushColor = '#FFFFFF';
      }
      
      updateBrushSettings();
    }
    
    // Show toast notification
    function showToast(message) {
      toastMessage.textContent = message;
      toast.classList.remove('hidden');
      
      setTimeout(() => {
        toast.classList.add('hidden');
      }, 3000);
    }
    
    // Event Listeners
    
    // Canvas events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);
    
    // Tool setting events
    brushTypeSelect.addEventListener('change', () => {
      state.brushType = brushTypeSelect.value;
      updateBrushSettings();
    });
    
    // Color picker
    currentColorSwatch.addEventListener('click', () => {
      colorPalette.classList.toggle('hidden');
    });
    
    document.addEventListener('click', (e) => {
      if (!colorPalette.contains(e.target) && e.target !== currentColorSwatch) {
        colorPalette.classList.add('hidden');
      }
    });
    
    // Color swatches in palette
    document.querySelectorAll('.color-palette .color-swatch').forEach(swatch => {
      swatch.style.backgroundColor = swatch.dataset.color;
      
      swatch.addEventListener('click', () => {
        state.brushColor = swatch.dataset.color;
        customColorInput.value = swatch.dataset.color;
        updateBrushSettings();
        colorPalette.classList.add('hidden');
        
        // Set tool back to brush if it was eraser
        if (state.activeTool === 'eraser') {
          setActiveTool('brush');
        }
      });
    });
    
    // Custom color input
    customColorInput.addEventListener('input', () => {
      state.brushColor = customColorInput.value;
      updateBrushSettings();
      
      // Set tool back to brush if it was eraser
      if (state.activeTool === 'eraser') {
        setActiveTool('brush');
      }
    });
    
    // Sliders
    smoothingSlider.addEventListener('input', () => {
      state.smoothingLevel = parseInt(smoothingSlider.value);
      smoothingValue.textContent = smoothingSlider.value;
    });
    
    sizeSlider.addEventListener('input', () => {
      state.brushSize = parseInt(sizeSlider.value);
      sizeValue.textContent = sizeSlider.value;
      updateBrushSettings();
    });
    
    // Tool buttons
    brushTool.addEventListener('click', () => setActiveTool('brush'));
    eraserTool.addEventListener('click', () => setActiveTool('eraser'));
    clearCanvasBtn.addEventListener('click', clearCanvas);
    clearCanvasFooter.addEventListener('click', clearCanvas);
    
    // Save buttons
    saveBtn.addEventListener('click', saveDrawing);
    saveFooter.addEventListener('click', saveDrawing);
    
    // Other buttons
    shareBtn.addEventListener('click', () => {
      showToast('Coming Soon: Share functionality');
    });
    
    // Initialize
    initCanvas();
  });
  