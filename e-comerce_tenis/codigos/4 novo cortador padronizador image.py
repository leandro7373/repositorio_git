import os
import cv2
import pytesseract
from PIL import Image, ImageEnhance
import numpy as np
import pandas as pd
from concurrent.futures import ThreadPoolExecutor
import glob
import re
import json

# Define BASE_DIR e carrega configuração
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_PATH = os.path.join(BASE_DIR, "configuracoes", "configuração diretórios.json")
with open(CONFIG_PATH, encoding="utf-8") as f:
    cfg = json.load(f)

CSV_DIR = os.path.join(BASE_DIR, cfg["CSV_DIR"])
IMAGENS_DIR = os.path.join(BASE_DIR, cfg["IMAGENS_ORIGINAIS_DIR"])
IMAGENS_LIMPAS_DIR = os.path.join(BASE_DIR, cfg["IMAGENS_LIMPAS_DIR"])

def buscar_pasta_imagens_mais_recente(imagens_dir):
    padrao = os.path.join(imagens_dir, "originais_*")
    pastas = glob.glob(padrao)
    if not pastas:
        raise FileNotFoundError("Nenhuma pasta 'originais_YYYY-MM-DD' encontrada.")
    def extrair_data(pasta):
        m = re.search(r'originais_(\d{4}-\d{2}-\d{2})', pasta)
        return m.group(1) if m else ""
    pastas = sorted(pastas, key=lambda p: extrair_data(p))
    pasta_mais_recente = pastas[-1]
    data_str = extrair_data(pasta_mais_recente)
    return pasta_mais_recente, data_str

def buscar_csv_mais_recente(csv_dir):
    padrao = os.path.join(csv_dir, "tenis_dados_*.csv")
    arquivos = glob.glob(padrao)
    if not arquivos:
        raise FileNotFoundError("Nenhum arquivo 'tenis_dados_*.csv' encontrado.")
    arquivos = sorted(arquivos, key=os.path.getmtime)
    return arquivos[-1]

def apagar_codigo_na_imagem(img_path, texto_codigo, saida_path):
    img = cv2.imread(img_path)
    if img is None:
        return "imagem não encontrada ou inválida"
    altura, largura = img.shape[:2]
    faixa_altura = int(altura * 0.15)  # Ajuste conforme necessário
    y_inicio = altura - faixa_altura

    # Recorta só a faixa inferior para o OCR
    faixa_inferior = img[y_inicio:altura, 0:largura]
    pil_img = Image.fromarray(cv2.cvtColor(faixa_inferior, cv2.COLOR_BGR2RGB))
    # Aumenta o contraste apenas para o OCR
    pil_img_contraste = ImageEnhance.Contrast(pil_img).enhance(2.5)

    data = pytesseract.image_to_data(pil_img_contraste, lang="eng", output_type=pytesseract.Output.DICT)
    n_boxes = len(data['level'])
    apagou = False

    for i in range(n_boxes):
        texto = data['text'][i].strip()
        if texto:
            (x, y, w, h) = (data['left'][i], data['top'][i], data['width'][i], data['height'][i])
            # Corrige a posição y para a imagem original
            cv2.rectangle(img, (x, y + y_inicio), (x + w, y + h + y_inicio), (255, 255, 255), -1)
            apagou = True

    cv2.imwrite(saida_path, img)
    return "codigo apagado" if apagou else "codigo nao apagado"

def processar_linha(idx, img_col, img_name, codigo, input_dir, output_dir):
    img_name = str(img_name).strip()
    codigo = str(codigo).strip()
    if not img_name or not codigo:
        return idx, img_col, "sem nome de imagem ou código"
    img_path = os.path.join(input_dir, img_name)
    saida_path = os.path.join(output_dir, img_name)
    if not os.path.isfile(img_path):
        return idx, img_col, "imagem não encontrada"
    # Tenta apagar o código até 3 vezes se não conseguir
    for tentativa in range(3):
        status = apagar_codigo_na_imagem(img_path, codigo, saida_path)
        if status == "codigo apagado":
            break
    return idx, img_col, status

if __name__ == "__main__":
    pasta_imagens, data_str = buscar_pasta_imagens_mais_recente(IMAGENS_DIR)
    output_dir = os.path.join(IMAGENS_LIMPAS_DIR, f"limpas_{data_str}")
    os.makedirs(output_dir, exist_ok=True)
    csv_path = buscar_csv_mais_recente(CSV_DIR)
    df = pd.read_csv(csv_path)

    # Garante as colunas de status com os nomes solicitados
    for col in ["limpeza_imagem1", "limpeza_imagem2"]:
        if col not in df.columns:
            df[col] = ""

    tarefas = []
    for idx, row in df.iterrows():
        # Para imagem_local1, usa ocr_final1
        if "imagem_local1" in row and "ocr_final1" in row:
            status1 = str(row.get("limpeza_imagem1", "")).strip().lower()
            if status1 != "codigo apagado":
                tarefas.append((idx, "imagem_local1", row["imagem_local1"], row["ocr_final1"]))
        # Para imagem_local2, usa ocr_final2
        if "imagem_local2" in row and "ocr_final2" in row:
            status2 = str(row.get("limpeza_imagem2", "")).strip().lower()
            if status2 != "codigo apagado":
                tarefas.append((idx, "imagem_local2", row["imagem_local2"], row["ocr_final2"]))

    resultados = []
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = [executor.submit(processar_linha, idx, img_col, img_name, codigo, pasta_imagens, output_dir)
                   for idx, img_col, img_name, codigo in tarefas]
        for future in futures:
            idx, img_col, status = future.result()
            if img_col == "imagem_local1":
                df.at[idx, "limpeza_imagem1"] = status
            elif img_col == "imagem_local2":
                df.at[idx, "limpeza_imagem2"] = status
            print(f"{img_col} - {df.at[idx, img_col]}: {status}")

 # Salva o CSV atualizado
df.to_csv(csv_path, index=False, encoding="utf-8-sig")
print("Processamento finalizado. Status salvo no CSV.")

# Resumo dos resultados
limpas1 = (df["limpeza_imagem1"] == "codigo apagado").sum()
nao_limpas1 = (df["limpeza_imagem1"] == "codigo nao apagado").sum()
limpas2 = (df["limpeza_imagem2"] == "codigo apagado").sum()
nao_limpas2 = (df["limpeza_imagem2"] == "codigo nao apagado").sum()

print(f"Imagem 1 - Limpa: {limpas1}, Não limpa: {nao_limpas1}")
print(f"Imagem 2 - Limpa: {limpas2}, Não limpa: {nao_limpas2}")