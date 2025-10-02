import pandas as pd

# Carregue os dois arquivos
antigo = pd.read_csv('/Users/leandro/Desktop/Python/catalogo-tenis/e-comerce_tenis/dados/csv/tenis_dados_atual.csv')
novo = pd.read_csv('/Users/leandro/Desktop/Python/script_run_paralelo/CSV Geral/todos_os_tenis.csv')
# Considere as colunas que identificam um modelo (ex: marca, modelo, numeracao)
colunas_chave = ['marca', 'modelo', 'numeracao']

# Modelos presentes no antigo e não no novo
antigos_unicos = antigo.drop_duplicates(subset=colunas_chave)
novos_unicos = novo.drop_duplicates(subset=colunas_chave)

faltando = antigos_unicos.merge(novos_unicos, on=colunas_chave, how='left', indicator=True)
faltando = faltando[faltando['_merge'] == 'left_only']

print(faltando[colunas_chave])