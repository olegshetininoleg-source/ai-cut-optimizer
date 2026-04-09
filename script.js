async function calculateCutting() {
    const resultsDiv = document.getElementById('results');
    const actionButtons = document.getElementById('actionButtons');
    
    resultsDiv.innerHTML = 'Считаю... (первый запуск может занять до 1 минуты)';
    actionButtons.style.display = 'none';

    try {
        const sheetW = parseFloat(document.getElementById('sheetW').value);
        const sheetH = parseFloat(document.getElementById('sheetH').value);
        const kerf = parseFloat(document.getElementById('kerf').value); 
        const partsText = document.getElementById('partsInput').value;

        let totalEdgeMm = 0;
        const parts = [];
        const lines = partsText.split('\n').filter(line => line.trim() !== '');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const arr = line.split(',').map(item => item.trim());
            if (arr.length < 4) throw new Error(`Ошибка в строке ${i + 1}: не хватает данных.`);

            const id = arr[0], w = parseFloat(arr[1]), h = parseFloat(arr[2]), count = parseInt(arr[3]);
            const ew = parseInt(arr[4]) || 0, eh = parseInt(arr[5]) || 0;

            if (isNaN(w) || isNaN(h) || isNaN(count)) throw new Error(`Ошибка в строке ${i + 1}: нужны числа.`);
            
            totalEdgeMm += (w * ew + h * eh) * count;
            parts.push({ id, w, h, count, edge_w: ew, edge_h: eh });
        }

        const response = await fetch('https://ai-cut-optimizer.onrender.com/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sheet_w: sheetW, sheet_h: sheetH, kerf: kerf, parts: parts })
        });

        if (!response.ok) throw new Error("Ошибка сервера. Проверь размеры деталей.");

        const data = await response.json();
        const totalEdgeMeters = (totalEdgeMm / 1000).toFixed(2);

        if (data.status === 'success') {
            resultsDiv.innerHTML = `<h2>Листов: ${data.sheets_used}</h2><h3>Кромка: ${totalEdgeMeters} м</h3>`;
            actionButtons.style.display = 'block'; 
            
            data.layout.forEach(sheet => {
                const canvas = document.createElement('canvas');
                const scale = 800 / sheetW; 
                const padding = 50; 
                canvas.width = (sheetW * scale) + padding * 2;
                canvas.height = (sheetH * scale) + padding * 2;
                canvas.className = "print-canvas"; 
                resultsDiv.appendChild(canvas);

                const ctx = canvas.getContext('2d');
                ctx.translate(padding, padding);
                ctx.fillStyle = '#e0e0e0';
                ctx.fillRect(0, 0, sheetW * scale, sheetH * scale);

                sheet.parts.forEach(part => {
                    const x = part.x * scale, y = part.y * scale, w = part.w * scale, h = part.h * scale;
                    ctx.fillStyle = '#ffaa00';
                    ctx.fillRect(x, y, w, h);
                    ctx.strokeStyle = '#000';
                    ctx.strokeRect(x, y, w, h);

                    // Кромка
                    ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 4;
                    if (part.edge_w > 0) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke(); }
                    if (part.edge_w > 1) { ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.stroke(); }
                    if (part.edge_h > 0) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + h); ctx.stroke(); }
                    if (part.edge_h > 1) { ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.stroke(); }

                    ctx.fillStyle = '#000'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
                    ctx.fillText(part.id, x + w / 2, y + h / 2);
                    ctx.font = '10px Arial';
                    ctx.fillText(part.w, x + w / 2, y + 12);
                });
            });
        }
    } catch (error) {
        resultsDiv.innerHTML = `<p style="color:red">${error.message}</p>`;
    }
}
