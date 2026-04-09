async function calculateCutting() {
    const resultsDiv = document.getElementById('results');
    const actionButtons = document.getElementById('actionButtons');
    
    resultsDiv.innerHTML = 'Считаю...';
    actionButtons.style.display = 'none';

    try {
        const sheetW = parseFloat(document.getElementById('sheetW').value);
        const sheetH = parseFloat(document.getElementById('sheetH').value);
        const kerf = parseFloat(document.getElementById('kerf').value); 
        const partsText = document.getElementById('partsInput').value;

        let totalEdgeMm = 0;
        const parts = [];

        // Разбиваем текст на строки и убираем пустые
        const lines = partsText.split('\n').filter(line => line.trim() !== '');

        // --- БЛОК ЗАЩИТЫ ОТ ОШИБОК И ОПЕЧАТОК ---
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const arr = line.split(',').map(item => item.trim());

            // 1. Проверяем, есть ли хотя бы 4 значения (Имя, Ш, В, Кол-во)
            if (arr.length < 4) {
                throw new Error(`ОШИБКА В СТРОКЕ ${i + 1}: "${line}"<br>Не хватает данных! Убедись, что значения разделены ЗАПЯТЫМИ, а не точками или пробелами.`);
            }

            const id = arr[0];
            const w = parseFloat(arr[1]);
            const h = parseFloat(arr[2]);
            const count = parseInt(arr[3]);
            const edgeW = parseInt(arr[4]) || 0; // Если кромка не указана, ставим 0
            const edgeH = parseInt(arr[5]) || 0;

            // 2. Проверяем, действительно ли размеры - это числа
            if (isNaN(w) || isNaN(h) || isNaN(count)) {
                throw new Error(`ОШИБКА В СТРОКЕ ${i + 1}: "${line}"<br>Размеры и количество должны быть цифрами! Вы точно разделили их запятыми?`);
            }

            totalEdgeMm += (w * edgeW + h * edgeH) * count;
            parts.push({ id: id, w: w, h: h, count: count, edge_w: edgeW, edge_h: edgeH });
        }
        // ----------------------------------------

        const totalEdgeMeters = (totalEdgeMm / 1000).toFixed(2);

        const response = await fetch('http://127.0.0.1:8000/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sheet_w: sheetW, sheet_h: sheetH, kerf: kerf, parts: parts })
        });

        // Если сервер вернул ошибку (например, деталь больше самого листа)
        if (!response.ok) {
             throw new Error("Сервер не смог просчитать эту карту. Возможно, одна из деталей больше размера листа!");
        }

        const data = await response.json();

        if (data.status === 'success') {
            resultsDiv.innerHTML = `
                <h2>Потребуется листов: ${data.sheets_used}</h2>
                <h3 style="color: #d9534f;">Общая длина кромки: ${totalEdgeMeters} м</h3>
            `;
            actionButtons.style.display = 'block'; 
            
            data.layout.forEach(sheet => {
                const canvas = document.createElement('canvas');
                const scale = 800 / sheetW; 
                const padding = 50; 

                canvas.width = (sheetW * scale) + padding * 2;
                canvas.height = (sheetH * scale) + padding * 2;
                canvas.style.backgroundColor = "white";
                canvas.style.marginBottom = "30px";
                canvas.className = "print-canvas"; 
                resultsDiv.appendChild(canvas);

                const ctx = canvas.getContext('2d');
                ctx.translate(padding, padding);

                ctx.fillStyle = '#e0e0e0';
                ctx.fillRect(0, 0, sheetW * scale, sheetH * scale);

                ctx.fillStyle = '#000';
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(sheetW, (sheetW * scale) / 2, -10);
                
                ctx.save();
                ctx.translate(-15, (sheetH * scale) / 2);
                ctx.rotate(-Math.PI / 2);
                ctx.fillText(sheetH, 0, 0);
                ctx.restore();

                sheet.parts.forEach(part => {
                    const x = part.x * scale;
                    const y = part.y * scale;
                    const w = part.w * scale;
                    const h = part.h * scale;

                    ctx.fillStyle = '#ffaa00';
                    ctx.fillRect(x, y, w, h);
                    
                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x, y, w, h);

                    // Рисуем кромку
                    ctx.strokeStyle = '#e74c3c'; 
                    ctx.lineWidth = 4; 

                    if (part.edge_w > 0) {
                        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke(); // Верх
                    }
                    if (part.edge_w > 1) {
                        ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.stroke(); // Низ
                    }
                    if (part.edge_h > 0) {
                        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + h); ctx.stroke(); // Лево
                    }
                    if (part.edge_h > 1) {
                        ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.stroke(); // Право
                    }

                    ctx.fillStyle = '#000';
                    ctx.font = 'bold 14px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(part.id, x + w / 2, y + h / 2);

                    ctx.font = '12px Arial';
                    ctx.textBaseline = 'top';
                    ctx.fillText(part.w, x + w / 2, y + 6);

                    ctx.save();
                    ctx.translate(x + 14, y + h / 2);
                    ctx.rotate(-Math.PI / 2);
                    ctx.textBaseline = 'middle';
                    ctx.fillText(part.h, 0, 0);
                    ctx.restore();
                });
            });
        }
    } catch (error) {
        // Теперь ошибка выводится крупно и понятно!
        resultsDiv.innerHTML = `<div style="background-color: #ffeaea; border: 2px solid #d9534f; padding: 15px; border-radius: 5px;">
            <p style="color:#d9534f; font-weight:bold; font-size: 16px; margin: 0;">${error.message}</p>
        </div>`;
        console.error(error);
    }
}