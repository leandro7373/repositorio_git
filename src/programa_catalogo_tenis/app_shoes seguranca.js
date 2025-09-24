import React, { useState, useEffect, useRef } from "react";
import Papa from "papaparse";
import "./app_shoes.css";

// URL do CSV público do Google Sheets
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSMy3ycr2KZJ8UA6V_uoBvHVicKx3W79C0-zaW_7m5ANTL8M9-LwppcIuxK7P7scAr7-nM7g1rTXMRS/pub?gid=1965323582&single=true&output=csv";

// Função para buscar e ler o CSV
function fetchCSV(url, callback) {
  Papa.parse(url, {
    download: true, // baixa o arquivo
    header: true, // interpreta cabeçalhos
    skipEmptyLines: true, // ignora linhas vazias
    complete: (results) => callback(results.data), // chama callback com os dados
  });
}

// Função para gerar opções de numeração usando as colunas min e max do produto
function gerarNumeracoes(produto) {
  let nums = [];
  let min = parseInt(produto.min); // valor mínimo do produto
  let max = parseInt(produto.max); // valor máximo do produto
  if (!isNaN(min) && !isNaN(max) && min <= max) {
    for (let n = min; n <= max; n++) {
      nums.push(n); // adiciona cada número disponível
    }
  }
  return nums;
}

// Componente principal do catálogo
export default function CatalogoTenis() {
  // Estados principais do app
  const [modalAberto, setModalAberto] = useState(false); // controla se o modal está aberto
  const [tenisModal, setTenisModal] = useState(null); // produto exibido no modal
  const [modalIndex, setModalIndex] = useState(0); // índice da imagem exibida no modal
  const [produtos, setProdutos] = useState([]); // lista de produtos do CSV
  const [busca, setBusca] = useState(""); // termo de busca
  const [carrinho, setCarrinho] = useState([]); // itens do carrinho
  const [drawerOpen, setDrawerOpen] = useState(false); // controla se o carrinho está aberto
  const [menuOpen, setMenuOpen] = useState(false); // controla se o menu de marcas está aberto
  const [marcaSelecionada, setMarcaSelecionada] = useState(""); // marca filtrada
  const [valores, setValores] = useState([0, 1000]); // faixa de preço
  const [ultimosExibidos, setUltimosExibidos] = useState([]); // produtos exibidos
  const isFirstRender = useRef(true); // evita filtro na primeira renderização
  const [itensCarrinho, setItensCarrinho] = useState([]); // carrinho com quantidade e numeração

  // Busca os produtos do CSV ao carregar
  useEffect(() => {
    fetchCSV(CSV_URL, (data) => {
      setProdutos(data); // salva produtos no estado
      // Calcula faixa de preço para filtro
      const precos = data.map((p) => {
        const valor = p["preço_venda"] || p["preco_atacado_fornecedor"] || "0";
        return Number(valor.replace("R$", "").replace(",", "."));
      }).filter((v) => !isNaN(v));
      const min = Math.min(...precos); // menor preço
      const max = Math.max(...precos); // maior preço
      setValores([min, max]); // define faixa de preço
      setUltimosExibidos(data); // exibe todos inicialmente
    });
  }, []);

  // Filtra produtos conforme busca, marca e faixa de preço
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false; // ignora primeira renderização
      return;
    }
    const termo = busca.toLowerCase(); // termo de busca em minúsculo
    const filtrados = produtos.filter((p) => {
      const valor = p["preço_venda"] || p["preco_atacado_fornecedor"] || "0";
      const v = Number(valor.replace("R$", "").replace(",", "."));
      return (
        (!termo ||
          (p.marca && p.marca.toLowerCase().includes(termo)) ||
          (p.modelo && p.modelo.toLowerCase().includes(termo)) ||
          ((p["cód.tenis"] || "") + "").toLowerCase().includes(termo)
        ) &&
        v >= valores[0] &&
        v <= valores[1] &&
        (!marcaSelecionada || p.marca === marcaSelecionada)
      );
    });
    if (filtrados.length > 0 || (busca === "" && marcaSelecionada === "")) {
      setUltimosExibidos(filtrados.length > 0 ? filtrados : produtos); // exibe filtrados ou todos
    }
  }, [busca, produtos, valores, marcaSelecionada]);

  // Atualiza itens do carrinho com quantidade e numeração
  useEffect(() => {
    setItensCarrinho(
      carrinho.map((p, idx) => ({
        ...p,
        numeracao: p.numeracao || "",
        quantidade: p.quantidade || 1,
        idx,
      }))
    );
  }, [carrinho]);

  // Adiciona produto ao carrinho
  function addCarrinho(produto) {
    setCarrinho((c) => [...c, produto]);
  }

  // Remove produto do carrinho
  function removeCarrinho(idx) {
    setCarrinho((c) => c.filter((_, i) => i !== idx));
  }

  // Atualiza quantidade ou numeração de um item do carrinho
  function atualizarItemCarrinho(idx, campo, valor) {
    setItensCarrinho((itens) =>
      itens.map((item, i) =>
        i === idx ? { ...item, [campo]: valor } : item
      )
    );
    setCarrinho((c) =>
      c.map((item, i) =>
        i === idx ? { ...item, [campo]: valor } : item
      )
    );
  }

  // Modal de imagem ampliada com bolinhas de navegação e quadradinhos de numeração
  function ModalImagem() {
    if (!modalAberto || !tenisModal) return null; // só mostra se aberto
    const imagens = [
      tenisModal.image_link_github,
      tenisModal.image2_link_github
    ].filter(Boolean); // pega imagens válidas

    const [numeracaoSelecionada, setNumeracaoSelecionada] = useState(null); // numeração escolhida
    const [botaoCarrinhoAtivo, setBotaoCarrinhoAtivo] = useState(false); // feedback visual do botão
    const touchStartX = useRef(null); // para swipe de imagens

    // Inicia swipe
    function handleTouchStart(e) {
      touchStartX.current = e.touches[0].clientX;
    }
    // Finaliza swipe e troca imagem se necessário
    function handleTouchEnd(e) {
      if (touchStartX.current === null) return;
      const touchEndX = e.changedTouches[0].clientX;
      const deltaX = touchEndX - touchStartX.current;
      if (Math.abs(deltaX) > 40) {
        if (deltaX < 0) setModalIndex((modalIndex + 1) % imagens.length);
        else setModalIndex((modalIndex - 1 + imagens.length) % imagens.length);
      }
      touchStartX.current = null;
    }

    // Quadradinhos de numeração organizados em grade 4x3
    const todosNumeros = Array.from({length: 12}, (_, i) => 34 + i); // [34, ..., 45]
    const disponiveis = gerarNumeracoes(tenisModal); // numerações disponíveis

    // Função para adicionar ao carrinho pelo modal
    function adicionarAoCarrinhoModal() {
      if (!numeracaoSelecionada) {
        alert("Selecione uma numeração antes de adicionar ao carrinho.");
        return;
      }
      setBotaoCarrinhoAtivo(true); // ativa feedback visual
      addCarrinho({ ...tenisModal, numeracao: numeracaoSelecionada, quantidade: 1 });
      setTimeout(() => {
        setBotaoCarrinhoAtivo(false); // desativa feedback
        setModalAberto(false); // fecha modal
      }, 250); // tempo para mostrar o feedback visual
    }

    return (
      <>
        {/* Fundo escurecido */}
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 3000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
          onClick={() => setModalAberto(false)} // fecha modal ao clicar fora
        >
          {/* Modal centralizado e responsivo */}
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
              padding: 24,
              maxWidth: "90vw",
              maxHeight: "90vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              position: "relative"
            }}
            onClick={e => e.stopPropagation()} // impede fechar ao clicar dentro
          >
            {/* Imagem ampliada */}
            <div
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                position: "relative"
              }}
            >
              <img
                src={imagens[modalIndex]}
                alt={tenisModal.modelo}
                className="modal-img-popup"
                style={{
                  maxWidth: "80vw",
                  maxHeight: "60vh",
                  borderRadius: 20,
                  marginBottom: 20,
                  objectFit: "contain",
                  cursor: "pointer"
                }}
                onClick={() => setModalIndex((modalIndex + 1) % imagens.length)} // troca imagem ao clicar
                onTouchStart={handleTouchStart} // inicia swipe
                onTouchEnd={handleTouchEnd} // finaliza swipe
              />
              {/* Bolinhas de navegação */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 20,
                }}
              >
                {imagens.map((_, idx) => (
                  <span
                    key={idx}
                    onClick={() => setModalIndex(idx)} // troca imagem ao clicar na bolinha
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: modalIndex === idx ? "#3a2e4f" : "#ede7f6", // cor ativa/inativa
                      border: modalIndex === idx ? "2px solid #3a2e4f" : "2px solid #ede7f6",
                      display: "inline-block",
                      cursor: "pointer",
                      transition: "background 0.2s, border 0.2s"
                    }}
                  />
                ))}
              </div>
            </div>
            {/* Informações do tênis */}
            <div style={{ fontWeight: 600, fontSize: "1.1rem", marginBottom: 20 }}>
              {tenisModal.marca} - {tenisModal.modelo}
            </div>
            {/* Quadradinhos de numeração em grade 4x3, botões grandes e responsivos */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 12,
                marginBottom: 20,
                justifyContent: "center"
              }}
            >
              {todosNumeros.map(num => {
                const disponivel = disponiveis.includes(num); // verifica se disponível
                const ativo = numeracaoSelecionada === num; // verifica se selecionado
                return (
                  <button
                    key={num}
                    onClick={() => disponivel && setNumeracaoSelecionada(num)} // seleciona numeração
                    disabled={!disponivel} // desabilita se não disponível
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 12,
                      border: disponivel
                        ? (ativo ? "2.5px solid #3a2e4f" : "1.5px solid #ccc")
                        : "1.5px solid #bbb",
                      background: ativo
                        ? "#d1c4e9" // cor de fundo se ativo
                        : disponivel
                          ? "#fff" // cor de fundo se disponível
                          : "#f3f0f7", // cor de fundo se indisponível
                      fontWeight: 600,
                      fontSize: "1.3rem",
                      color: disponivel ? "#3a2e4f" : "#aaa", // cor do texto
                      cursor: disponivel ? "pointer" : "not-allowed",
                      position: "relative",
                      transition: "border 0.2s, background 0.2s",
                      userSelect: "none",
                      touchAction: "manipulation"
                    }}
                    tabIndex={disponivel ? 0 : -1}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
            {/* Botão Adicionar ao Carrinho com feedback visual */}
            <button
              onClick={adicionarAoCarrinhoModal} // adiciona ao carrinho
              style={{
                minWidth: 180,
                padding: "12px 24px",
                background: botaoCarrinhoAtivo ? "#6c63ff" : "#3a2e4f", // cor de feedback visual
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                fontSize: "1.1rem",
                marginBottom: 8,
                cursor: "pointer",
                boxShadow: botaoCarrinhoAtivo
                  ? "0 2px 16px rgba(108,99,255,0.18)"
                  : "0 2px 8px rgba(58,46,79,0.08)",
                transition: "background 0.2s, box-shadow 0.2s"
              }}
            >
              {botaoCarrinhoAtivo ? "Adicionado!" : "Adicionar ao Carrinho"}
            </button>
            {/* Botão "X" para fechar */}
            <button
              onClick={() => setModalAberto(false)} // fecha modal
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                background: "transparent",
                border: "none",
                fontSize: "2rem",
                color: "#222",
                cursor: "pointer",
                zIndex: 3100,
                lineHeight: 1,
                transition: "color 0.2s"
              }}
              aria-label="Fechar"
              onMouseDown={e => e.currentTarget.style.color = "#6c63ff"} // cor ao clicar
              onMouseUp={e => e.currentTarget.style.color = "#222"} // volta ao normal
              onMouseLeave={e => e.currentTarget.style.color = "#222"} // volta ao normal
            >
              &times;
            </button>
          </div>
        </div>
      </>
    );
  }

  // Carrinho lateral
  function Carrinho() {
    // Calcula o total do carrinho
    const total = itensCarrinho.reduce((acc, p) => {
      const valor = p["preço_venda"] || p["preco_atacado_fornecedor"] || "0";
      return acc + Number(valor.replace("R$", "").replace(",", ".")) * (Number(p.quantidade) || 1);
    }, 0);

    // Função para enviar pedido via WhatsApp
    function enviarPedido() {
      const mensagem = itensCarrinho.map((p, idx) => (
        `• Código: ${p["cód.tenis"] || "-"}\n` +
        `Marca: ${p.marca}\n` +
        `Modelo: ${p.modelo}\n` +
        `Numeração: ${p.numeracao || "-"}\n` +
        `Qtd: ${p.quantidade || 1}\n` +
        `Valor: ${p["preço_venda"] || p["preco_atacado_fornecedor"]}\n`
      )).join('\n----------------------\n');
      const texto = `Olá! Gostaria de fazer um pedido:\n\n${mensagem}\nTotal: R$ ${total.toFixed(2)}`;
      const url = `https://wa.me/5531983581412?text=${encodeURIComponent(texto)}`;
      window.open(url, "_blank");
    }

    const [botaoPedidoAtivo, setBotaoPedidoAtivo] = useState(false); // feedback visual do botão

    return (
      <div
        className={`offcanvas offcanvas-start${drawerOpen ? " show" : ""}`}
        tabIndex="-1"
        style={{
          visibility: drawerOpen ? "visible" : "hidden",
          background: "#fff",
          zIndex: 2000,
          width: "340px",
          maxWidth: "60vw"
        }}
      >
        <div className="offcanvas-header">
          <h5 className="offcanvas-title">Carrinho</h5>
          <button type="button" className="btn-close" onClick={() => setDrawerOpen(false)}></button>
        </div>
        <div className="offcanvas-body">
          <ul className="list-group">
            {itensCarrinho.map((p, idx) => (
              <li className="list-group-item d-flex align-items-center gap-2" key={idx}>
                <img
                  src={p.image_link_github}
                  alt={p.modelo}
                  style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{p.marca} - {p.modelo}</div>
                  <div style={{ fontSize: "0.9em", color: "#555" }}>
                    Valor: {p["preço_venda"] || p["preco_atacado_fornecedor"]}
                  </div>
                  <div className="d-flex align-items-center gap-1 mt-1">
                    <label style={{ fontSize: "0.85em" }}>Qtd:</label>
                    <input
                      type="number"
                      min={1}
                      value={p.quantidade}
                      onChange={e => atualizarItemCarrinho(idx, "quantidade", e.target.value)}
                      style={{ width: 40, fontSize: "0.9em" }}
                    />
                    <label style={{ fontSize: "0.85em", marginLeft: "8px" }}>Numeração:</label>
                    <select
                      value={p.numeracao}
                      onChange={e => atualizarItemCarrinho(idx, "numeracao", e.target.value)}
                      style={{ width: 70, fontSize: "0.9em" }}
                    >
                      <option value="">Selecione</option>
                      {gerarNumeracoes(p).map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => removeCarrinho(idx)} // remove item do carrinho
                  title="Remover"
                  style={{
                    transition: "background 0.2s",
                  }}
                  onMouseDown={e => e.currentTarget.style.background = "#6c63ff"} // cor ao clicar
                  onMouseUp={e => e.currentTarget.style.background = ""}
                  onMouseLeave={e => e.currentTarget.style.background = ""}
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 fw-bold">
            Total: R$ {total.toFixed(2)}
          </div>
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 80 }}>
            <button
              className="btn btn-dark"
              style={{
                minWidth: 180,
                fontWeight: 600,
                fontSize: "1.1rem",
                background: botaoPedidoAtivo ? "#6c63ff" : "",
                transition: "background 0.2s"
              }}
              onClick={() => {
                setBotaoPedidoAtivo(true); // ativa feedback visual
                setTimeout(() => {
                  setBotaoPedidoAtivo(false); // desativa feedback
                  enviarPedido(); // envia pedido
                }, 200);
              }}
              disabled={itensCarrinho.length === 0}
            >
              {botaoPedidoAtivo ? "Enviando..." : "Enviar Pedido"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Menu lateral de marcas
  function MenuMarcas() {
    // Lista única de marcas
    const marcas = [...new Set(produtos.map((p) => p.marca).filter(Boolean))];
    return (
      <div
        className={`offcanvas offcanvas-end${menuOpen ? " show" : ""}`}
        tabIndex="-1"
        style={{
          visibility: menuOpen ? "visible" : "hidden",
          background: "#fff",
          zIndex: 2000,
          width: "340px",
          maxWidth: "60vw"
        }}
      >
        <div className="offcanvas-header">
          <h5 className="offcanvas-title">Marcas</h5>
          <button type="button" className="btn-close" onClick={() => setMenuOpen(false)}></button>
        </div>
        <div className="offcanvas-body">
          <ul className="list-group">
            <li
              className={`list-group-item${marcaSelecionada === "" ? " active" : ""}`}
              style={{ cursor: "pointer", transition: "background 0.2s" }}
              onClick={() => { setMarcaSelecionada(""); setMenuOpen(false); }} // mostra todas as marcas
              onMouseDown={e => e.currentTarget.style.background = "#ede7f6"}
              onMouseUp={e => e.currentTarget.style.background = ""}
              onMouseLeave={e => e.currentTarget.style.background = ""}
            >
              Todas as marcas
            </li>
            {marcas.map((marca) => (
              <li
                key={marca}
                className={`list-group-item${marcaSelecionada === marca ? " active" : ""}`}
                style={{ cursor: "pointer", transition: "background 0.2s" }}
                onClick={() => { setMarcaSelecionada(marca); setMenuOpen(false); }} // filtra pela marca
                onMouseDown={e => e.currentTarget.style.background = "#ede7f6"}
                onMouseUp={e => e.currentTarget.style.background = ""}
                onMouseLeave={e => e.currentTarget.style.background = ""}
              >
                {marca}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // Filtro dos produtos para exibição
  const termo = busca.toLowerCase();
  const filtrados = produtos.filter((p) => {
    const valor = p["preço_venda"] || p["preco_atacado_fornecedor"] || "0";
    const v = Number(valor.replace("R$", "").replace(",", "."));
    return (
      (!termo ||
        (p.marca && p.marca.toLowerCase().includes(termo)) ||
        (p.modelo && p.modelo.toLowerCase().includes(termo)) ||
        ((p["cód.tenis"] || "") + "").toLowerCase().includes(termo)
      ) &&
      v >= valores[0] &&
      v <= valores[1] &&
      (!marcaSelecionada || p.marca === marcaSelecionada)
    );
  });

  // Renderização principal do catálogo
  return (
    <div className="container py-4">
      {/* Modal de imagem ampliada */}
      <ModalImagem />
      {/* Barra superior fixa com logo, menu e sacola */}
      <div className="sticky-top bg-white d-flex align-items-center justify-content-between px-2"
        style={{height: 72, zIndex: 1100, borderBottom: "1px solid #eee"}}>
        {/* Logo */}
        <img
          src="/Logo.png"
          alt="Logo"
          style={{
            height: 50,
            width: "auto",
            objectFit: "contain",
            marginTop: 10,
            marginBottom: 10,
            display: "block"
          }}
        />
        {/* Sacola e menu hamburguer */}
        <div className="d-flex align-items-center gap-3">
          {/* Sacola */}
          <button
            className="btn btn-link p-0 position-relative"
            style={{height: 44, transition: "background 0.2s"}}
            onClick={() => setDrawerOpen(true)} // abre carrinho lateral
            onMouseDown={e => e.currentTarget.style.background = "#ede7f6"} // cor ao clicar
            onMouseUp={e => e.currentTarget.style.background = ""}
            onMouseLeave={e => e.currentTarget.style.background = ""}
          >
            <i className="bi bi-bag" style={{fontSize: "2rem"}}></i>
            {carrinho.length > 0 && (
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                {carrinho.length}
              </span>
            )}
          </button>
          {/* Menu hamburguer */}
          <button
            className="btn btn-link p-0"
            style={{height: 44, transition: "background 0.2s"}}
            onClick={() => setMenuOpen(true)} // abre menu lateral
            onMouseDown={e => e.currentTarget.style.background = "#ede7f6"}
            onMouseUp={e => e.currentTarget.style.background = ""}
            onMouseLeave={e => e.currentTarget.style.background = ""}
          >
            <i className="bi bi-list" style={{fontSize: "2.2rem"}}></i>
          </button>
        </div>
      </div>
      {/* Barra de pesquisa fixa com caixinha de marca */}
      <div className="barra-pesquisa-sticky py-2 sticky-top bg-white" style={{ zIndex: 1200 }}>
        <div className="input-group">
          {/* Botão da lupa clicável */}
          <button
            className="input-group-text"
            id="search-icon"
            style={{height: 40, border: "none", background: "transparent", cursor: "pointer", transition: "background 0.2s"}}
            type="button"
            onClick={() => {
              document.getElementById("input-busca-tenis")?.focus(); // foca no input
            }}
            tabIndex={0}
            aria-label="Buscar"
            onMouseDown={e => e.currentTarget.style.background = "#ede7f6"}
            onMouseUp={e => e.currentTarget.style.background = "transparent"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <i className="bi bi-search"></i>
          </button>
          <input
            type="text"
            className="form-control"
            id="input-busca-tenis"
            placeholder="Busca"
            value={busca}
            onChange={e => setBusca(e.target.value)} // atualiza busca
            aria-label="Buscar"
            aria-describedby="search-icon"
            style={{height: 40}}
            onKeyDown={e => {
              if (e.key === "Enter") {
                e.target.blur();
                e.target.focus();
              }
            }}
          />
        </div>
        {/* Mensagem de erro se não encontrar produto */}
        {produtos.length > 0 && filtrados.length === 0 && busca !== "" && (
          <div className="text-danger mt-2" style={{fontWeight: 500, fontSize: '1rem'}}>
            Item não encontrado
          </div>
        )}
        {/* Caixinha de filtro de marca fixa junto da barra de busca */}
        {marcaSelecionada && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "#ede7f6",
              color: "#3a2e4f",
              borderRadius: 20,
              padding: "6px 16px",
              fontWeight: 600,
              fontSize: "1rem",
              margin: "12px 0",
              boxShadow: "0 2px 8px rgba(58,46,79,0.08)",
              transition: "background 0.2s"
            }}
          >
            <span>{marcaSelecionada}</span>
            <button
              onClick={() => setMarcaSelecionada("")} // remove filtro de marca
              style={{
                marginLeft: 10,
                background: "transparent",
                border: "none",
                color: "#3a2e4f",
                fontSize: "1.2rem",
                cursor: "pointer",
                fontWeight: 700,
                lineHeight: 1,
                transition: "background 0.2s"
              }}
              aria-label="Remover filtro de marca"
              title="Remover filtro de marca"
              onMouseDown={e => e.currentTarget.style.background = "#d1c4e9"}
              onMouseUp={e => e.currentTarget.style.background = "transparent"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              &times;
            </button>
          </div>
        )}
      </div>
      {/* Carrinho lateral */}
      <Carrinho />
      {/* Menu lateral de marcas */}
      <MenuMarcas />
      {/* Fundo escurecido do carrinho/menu */}
      {(drawerOpen || menuOpen) && (
        <div
          className="offcanvas-backdrop fade show"
          style={{
            zIndex: 1999,
            background: "rgba(0,0,0,0.5)",
            position: "fixed",
            top: 0, left: 0, width: "100vw", height: "100vh"
          }}
          onClick={() => {
            setDrawerOpen(false); // fecha carrinho
            setMenuOpen(false); // fecha menu
          }}
        ></div>
      )}
      {/* Cards dos produtos */}
      <div className="row g-2 justify-content-center">
        {ultimosExibidos.map((p, idx) => (
          <div
            className="col-12 col-sm-6 col-md-3 card-col"
            key={idx}
            style={{ display: "flex" }}
          >
            <div
              className="card h-100 shadow-sm w-100 position-relative card-hover"
              onClick={() => {
                setTenisModal(p); // abre modal com produto clicado
                setModalAberto(true);
                setModalIndex(0); // começa sempre na primeira imagem
              }}
              style={{
                transition: "background 0.1s"
              }}
              onMouseDown={e => e.currentTarget.style.background = "#8e73c0ff"} // cor ao clicar no card
              onMouseUp={e => e.currentTarget.style.background = ""}
              onMouseLeave={e => e.currentTarget.style.background = ""}
            >
              {/* Botão de adicionar ao carrinho */}
             <div
              className="sacola-circulo"
              title="Adicionar ao Carrinho"
              onClick={e => {
                e.stopPropagation(); // impede abrir modal ao clicar na sacola
                addCarrinho(p); // adiciona ao carrinho
                // Remove a cor após um pequeno delay para garantir que o clique/touch não mantenha a cor
                setTimeout(() => {
                  if (e.currentTarget) e.currentTarget.style.background = ""; // sempre verifique se existe!
                }, 10); // tempo em ms, ajuste conforme desejar
              }}
              style={{
                transition: "background 0.2s"
              }}
              onMouseDown={e => e.currentTarget.style.background = "#8e73c0ff"} // cor ao clicar desktop
              onMouseUp={e => e.currentTarget.style.background = ""}
              onMouseLeave={e => e.currentTarget.style.background = ""}
              onTouchStart={e => e.currentTarget.style.background = "#8e73c0ff"} // cor ao tocar mobile
              onTouchEnd={e => setTimeout(() => {
                if (e.currentTarget) e.currentTarget.style.background = "";
              }, 10)}
              onTouchCancel={e => {
                if (e.currentTarget) e.currentTarget.style.background = "";
              }}
            >
              <i className="bi bi-bag"></i>
            </div>
              {/* Imagem do card */}
              <img
                src={p.image_link_github}
                className="card-img-top"
                alt={p.modelo}
                style={{ height: 210, objectFit: "cover" }}
              />
              {/* Informações do card */}
              <div className="card-body d-flex flex-column">
                <div className="fw-semibold">{p.modelo}</div>
                <div className="text-muted mb-2">{p.marca}</div>
                <div className="fw-bold fs-5 mb-1 preco-tenis">{p["preço_venda"] || p["preco_atacado_fornecedor"]}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/*
  =========================
  DICAS DE AJUSTE:
  =========================
  - Para mudar a cor do clique/touch nas sacolinhas, altere o valor em onMouseDown/onTouchStart.
  - Para mudar o tempo do efeito, altere o valor do setTimeout (em ms).
  - Para mudar a transição, altere o valor de "transition" no style.
  - Sempre cheque se e.currentTarget existe antes de acessar style.
  - Para ajustar o layout, altere os estilos inline ou classes CSS.
  - Para mudar textos, altere diretamente no JSX.
  - Para mudar a lógica de filtro, ajuste o useEffect e o filtro dos produtos.
*/