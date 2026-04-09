from rectpack import newPacker, PackingMode, PackingBin, GuillotineBssfMaxas

def calculate_cutting(sheet_w, sheet_h, parts, kerf=0):
    packer = newPacker(
        mode=PackingMode.Offline, 
        bin_algo=PackingBin.BFF, 
        pack_algo=GuillotineBssfMaxas, 
        rotation=True
    )

    for i in range(20): 
        packer.add_bin(sheet_w, sheet_h)

    sorted_parts = sorted(parts, key=lambda p: p['w'] * p['h'], reverse=True)

    for part in sorted_parts:
        for _ in range(part['count']):
            # Прячем данные в rid: (Имя, Кромка_W, Кромка_H, Оригинальная_Ширина)
            rid = (part['id'], part['edge_w'], part['edge_h'], part['w'])
            packer.add_rect(part['w'] + kerf, part['h'] + kerf, rid)

    packer.pack()

    result = []
    for i, bin in enumerate(packer):
        sheet_layout = []
        for rect in bin:
            orig_id, ew, eh, orig_w = rect.rid
            
            # Проверяем, повернул ли алгоритм деталь
            is_rotated = (rect.width - kerf) != orig_w
            
            # Если повернул, меняем кромки местами
            final_ew = eh if is_rotated else ew
            final_eh = ew if is_rotated else eh

            sheet_layout.append({
                "id": orig_id,
                "x": rect.x,
                "y": rect.y,
                "w": rect.width - kerf, 
                "h": rect.height - kerf,
                "edge_w": final_ew,
                "edge_h": final_eh
            })
        
        result.append({
            "sheet_id": i + 1,
            "parts": sheet_layout
        })

    return result