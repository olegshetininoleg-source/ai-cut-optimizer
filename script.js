async function calculateCutting() {
    const resultsDiv = document.getElementById('results');
    const actionButtons = document.getElementById('actionButtons');
    
    resultsDiv.innerHTML = 'Считаю... (первый запуск может занять до 1 минуты, пока просыпается сервер)';
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

            if (arr.length < 4) {
                throw new Error(`ОШИБКА В СТРОКЕ ${i + 1}: "${line}"<br>Убедись, что данные разделены ЗАПЯТЫМИ.`);
            }

            const id = arr[0];
            const w = parseFloat(arr[1]);
            const h = parseFloat(arr[2]);
            const count = parseInt(arr[3]);
            const edgeW = parseInt(arr[4]) || 0; 
            const edgeH = parseInt(arr[5]) || 0;

            if (isNaN(w) || isNaN(h) || isNaN(count)) {
                throw new Error(`ОШИБКА В СТРОКЕ ${i + 1}: "${line}"<br>Размеры должны быть числами.`);
            }

            totalEdgeMm += (w * edgeW + h * edgeH) * count;
            parts.push({ id, w, h, count, edge_w: edgeW, edge_h: edgeH });
        }

        const totalEdgeMeters = (totalEdgeMm / 1000).toFixed(2);

        // --- ТВОЯ ССЫЛКА НА ОБЛАКО ---
        const response = await fetch('https://ai-cut-optimizer.onrender.com/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sheet_w: sheetW, sheet_h: sheetH, kerf: kerf, parts: parts })
        });

        if (!response.ok) {
             throw new Error("Сервер не смог просчитать эту карту. Возможно, детали слишком большие.");
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
                canvas.style.backgroundColor = "