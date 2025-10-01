import React, { useState, useEffect, useRef } from "react";
import Papa from "papaparse";
import "./app_shoes.css";

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSMy3ycr2KZJ8UA6V_uoBvHVicKx3W79C0-zaW_7m5ANTL8M9-LwppcIuxK7P7scAr7-nM7g1rTXMRS/pub?gid=1426651797&single=true&output=csv";

function fetchCSV(url, callback) {
  Papa.parse(url, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: (results) => callback(results.data),
  });
}

function gerarNumeracoes(produto) {
  let nums = [];
  let min = parseInt(produto.min);
  let max = parseInt(produto.max);
  if (!isNaN(min) && !isNaN(max) && min <= max) {
    for (let n = min; n <= max; n++) {
      nums.push(n);
    }
  }
  return nums;
}

export default function CatalogoTenis() {
  const [modalAberto, setModalAberto] = useState(false);
  const [tenisModal, setTenisModal] = useState(null);
  const [modalIndex, setModalIndex] = useState(0);
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState("");
  const [carrinho, setCarrinho] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [marcaSelecionada, setMarcaSelecionada] = useState("");
  const [valores, setValores] = useState([0, 1000]);
  const [ultimosExibidos, setUltimosExibidos] = useState([]);
  const isFirstRender = useRef(true);
  const [itensCarrinho, setItensCarrinho] = useState([]);
  const [selecionados, setSelecionados] = useState([]);

  function toggleSelecionado(idx) {
    setSelecionados(sel =>
      sel.includes(idx)
        ? sel.filter(i => i !== idx)
        : [...sel, idx]
    );
  }
  useEffect(() => {
    fetchCSV(CSV_URL, (data) => {
      console.log("Dados carregados do CSV:", data); // <-- ADICIONE ESTA LINHA
      setProdutos(data);
      const precos = data.map((p) => {
        const valor = p["preço_venda"] || p["preco_atacado_fornecedor"] || "0";
        return Number(valor.replace("R$", "").replace(",", "."));
      }).filter((v) => !isNaN(v));
      const min = Math.min(...precos);
      const max = Math.max(...precos);
      setValores([min, max]);
      setUltimosExibidos(data);
    });
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
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
    if (filtrados.length > 0 || (busca === "" && marcaSelecionada === "")) {
      setUltimosExibidos(filtrados.length > 0 ? filtrados : produtos);
    }
  }, [busca, produtos, valores, marcaSelecionada]);

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

  function addCarrinho(produto) {
    setCarrinho((c) => [...c, produto]);
  }

  function removeCarrinho(idx) {
    setCarrinho((c) => c.filter((_, i) => i !== idx));
  }

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

  function ModalImagem() {
    if (!modalAberto || !tenisModal) return null;
    const imagens = [
      tenisModal.image_link_github,
      tenisModal.image2_link_github
    ].filter(Boolean);

    const [numeracaoSelecionada, setNumeracaoSelecionada] = useState(null);
    const [botaoCarrinhoAtivo, setBotaoCarrinhoAtivo] = useState(false);
    const touchStartX = useRef(null);

    function handleTouchStart(e) {
      touchStartX.current = e.touches[0].clientX;
    }
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

    const todosNumeros = Array.from({length: 12}, (_, i) => 34 + i);
    const disponiveis = gerarNumeracoes(tenisModal);

    function adicionarAoCarrinhoModal() {
      if (!numeracaoSelecionada) {
        alert("Selecione uma numeração antes de adicionar ao carrinho.");
        return;
      }
      setBotaoCarrinhoAtivo(true);
      addCarrinho({ ...tenisModal, numeracao: numeracaoSelecionada, quantidade: 1 });
      setTimeout(() => {
        setBotaoCarrinhoAtivo(false);
        setModalAberto(false);
      }, 250);
    }

    return (
      <>
        <div className="modal-overlay" onClick={() => setModalAberto(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-img-container">
              <img
                src={imagens[modalIndex]}
                alt={tenisModal.modelo}
                className="modal-img-popup"
                onClick={() => setModalIndex((modalIndex + 1) % imagens.length)}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              />
              <div className="modal-img-dots">
                {imagens.map((_, idx) => (
                  <span
                    key={idx}
                    className={`modal-img-dot${modalIndex === idx ? " active" : ""}`}
                    onClick={() => setModalIndex(idx)}
                  />
                ))}
              </div>
            </div>
            <div className="modal-title">
              {tenisModal.marca} - {tenisModal.modelo}
            </div>
            <div className="modal-numeracoes">
              {todosNumeros.map(num => {
                const disponivel = disponiveis.includes(num);
                const ativo = numeracaoSelecionada === num;
                return (
                  <button
                    key={num}
                    className={`modal-num-btn${ativo ? " active" : ""}${!disponivel ? " disabled" : ""}`}
                    onClick={() => disponivel && setNumeracaoSelecionada(num)}
                    disabled={!disponivel}
                    tabIndex={disponivel ? 0 : -1}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
            <button
              className={`modal-add-carrinho${botaoCarrinhoAtivo ? " added" : ""}`}
              onClick={adicionarAoCarrinhoModal}
            >
              {botaoCarrinhoAtivo ? "Adicionado!" : "Adicionar ao Carrinho"}
            </button>
            <button
              className="modal-close"
              onClick={() => setModalAberto(false)}
              aria-label="Fechar"
            >
              &times;
            </button>
          </div>
        </div>
      </>
    );
  }

  function Carrinho() {
    // Calcule o total apenas dos itens selecionados
    const itensSelecionados = itensCarrinho.filter((_, idx) => selecionados.includes(idx));
    const total = itensSelecionados.reduce((acc, p) => {
      const valor = p["preço_venda"] || p["preco_atacado_fornecedor"] || "0";
      return acc + Number(valor.replace("R$", "").replace(",", ".")) * (Number(p.quantidade) || 1);
    }, 0);

    function enviarPedido() {
      // Filtra apenas os itens selecionados
      const itensParaEnviar = itensCarrinho.filter((_, idx) => selecionados.includes(idx));
      const mensagem = itensParaEnviar.map((p, idx) => (
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

    const [botaoPedidoAtivo, setBotaoPedidoAtivo] = useState(false);

    function SwipeItem({ p, idx }) {
      return (
        <li className="carrinho-item" key={idx}>
          <input
            type="checkbox"
            checked={selecionados.includes(idx)}
            onChange={() => toggleSelecionado(idx)}
            style={{ marginRight: 12, width: 20, height: 20 }}
          />
          <img
            src={p.image_link_github}
            alt={p.modelo}
            className="carrinho-img"
          />
          <div className="carrinho-info">
            <div className="carrinho-marca">{p.marca}</div>
            <div className="carrinho-modelo">{p.modelo}</div>
            <div className="carrinho-numeracao">
              Tam: <span className="carrinho-numeracao-num">{p.numeracao || "-"}</span>
            </div>
            <div className="carrinho-valor">
              {p["preço_venda"] || p["preco_atacado_fornecedor"]}
            </div>
            <div className="carrinho-qtd-box">
              <button
                type="button"
                className="carrinho-qtd-btn"
                onClick={() => {
                  if (Number(p.quantidade) > 1) {
                    atualizarItemCarrinho(idx, "quantidade", Number(p.quantidade) - 1);
                  }
                }}
                aria-label="Diminuir quantidade"
              >-</button>
              <span className="carrinho-qtd-num">{p.quantidade}</span>
              <button
                type="button"
                className="carrinho-qtd-btn"
                onClick={() => {
                  atualizarItemCarrinho(idx, "quantidade", Number(p.quantidade) + 1);
                }}
                aria-label="Aumentar quantidade"
              >+</button>
            </div>
          </div>
        </li>
      );
    }

    return (
      <div className={`offcanvas offcanvas-start${drawerOpen ? " show" : ""}`} tabIndex="-1">
        <div className="offcanvas-header">
          <h5 className="offcanvas-title">Carrinho</h5>
          <button type="button" className="btn-close" onClick={() => setDrawerOpen(false)}></button>
        </div>
        <div className="offcanvas-body">
          <ul className="list-group">
            {itensCarrinho.map((p, idx) => (
              <SwipeItem p={p} idx={idx} key={idx} />
            ))}
          </ul>
          <div className="mt-3 fw-bold">
            Total: R$ {total.toFixed(2)}
          </div>
          <div className="d-flex justify-content-center align-items-center carrinho-btn-area" style={{gap: 12}}>
            {/* Checkbox "Todos" */}
            <input
              type="checkbox"
              checked={itensCarrinho.length > 0 && selecionados.length === itensCarrinho.length}
              onChange={() => {
                if (selecionados.length === itensCarrinho.length) {
                  setSelecionados([]);
                } else {
                  setSelecionados(itensCarrinho.map((_, idx) => idx));
                }
              }}
              style={{ width: 20, height: 20, marginRight: 6 }}
              id="selecionar-todos"
            />
            <label htmlFor="selecionar-todos" style={{marginRight: 16, marginBottom: 0, userSelect: "none", cursor: "pointer"}}>
              Todos
            </label>
            <button
              className={`btn btn-dark btn-carrinho-enviar${botaoPedidoAtivo ? " enviando" : ""}`}
              onClick={() => {
                setBotaoPedidoAtivo(true);
                setTimeout(() => {
                  setBotaoPedidoAtivo(false);
                  enviarPedido();
                }, 200);
              }}
              disabled={itensSelecionados.length === 0}
            >
              {botaoPedidoAtivo ? "Enviando..." : "Enviar Pedido"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  function MenuMarcas() {
    const marcas = [...new Set(produtos.map((p) => p.marca).filter(Boolean))];
    return (
      <div className={`offcanvas offcanvas-end${menuOpen ? " show" : ""}`} tabIndex="-1">
        <div className="offcanvas-header">
          <h5 className="offcanvas-title">Marcas</h5>
          <button type="button" className="btn-close" onClick={() => setMenuOpen(false)}></button>
        </div>
        <div className="offcanvas-body">
          <ul className="list-group">
            <li
              className={`list-group-item${marcaSelecionada === "" ? " active" : ""} menu-marca-item`}
              onClick={() => { setMarcaSelecionada(""); setMenuOpen(false); }}
            >
              Todas as marcas
            </li>
            {marcas.map((marca) => (
              <li
                key={marca}
                className={`list-group-item${marcaSelecionada === marca ? " active" : ""} menu-marca-item`}
                onClick={() => { setMarcaSelecionada(marca); setMenuOpen(false); }}
              >
                {marca}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

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

  return (
    <div className="container py-4">
      <ModalImagem />
      <div className="bg-white d-flex align-items-center justify-content-between px-2 header-bar">
        <img
          src="/Logo.png"
          alt="Logo"
          className="logo-img"
        />
        <div className="d-flex align-items-center gap-3">
          <button
            className="btn btn-link p-0 position-relative btn-carrinho"
            onClick={() => setDrawerOpen(true)}
            title="Carrinho"
          >
            <i className="bi bi-bag carrinho-icone"></i>
            {carrinho.length > 0 && (
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                {carrinho.length}
              </span>
            )}
          </button>
          <button
            className="btn btn-link p-0 btn-menu"
            onClick={() => setMenuOpen(true)}
          >
            <i className="bi bi-list menu-icone"></i>
          </button>
        </div>
      </div>
      <div className="barra-pesquisa-sticky py-2  bg-white barra-pesquisa">
        <div className="input-group">
          <button
            className="input-group-text btn-search"
            id="search-icon"
            type="button"
            onClick={() => {
              document.getElementById("input-busca-tenis")?.focus();
            }}
            tabIndex={0}
            aria-label="Buscar"
          >
            <i className="bi bi-search"></i>
          </button>
          <input
            type="text"
            className="form-control"
            id="input-busca-tenis"
            placeholder="Busca"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            aria-label="Buscar"
            aria-describedby="search-icon"
          />
        </div>
        {produtos.length > 0 && filtrados.length === 0 && busca !== "" && (
          <div className="text-danger mt-2 busca-nao-encontrada">
            Item não encontrado
          </div>
        )}
        {marcaSelecionada && (
          <div className="marca-filtro-ativa">
            <span>{marcaSelecionada}</span>
            <button
              className="marca-filtro-remover"
              onClick={() => setMarcaSelecionada("")}
              aria-label="Remover filtro de marca"
              title="Remover filtro de marca"
            >
              &times;
            </button>
          </div>
        )}
      </div>
      <Carrinho />
      <MenuMarcas />
      {(drawerOpen || menuOpen) && (
        <div
          className="offcanvas-backdrop fade show"
          onClick={() => {
            setDrawerOpen(false);
            setMenuOpen(false);
          }}
        ></div>
      )}
      <div className="main-content"></div>
      <div className="row g-2 justify-content-center cards-grid-limit">
        {ultimosExibidos.map((p, idx) => (
          <div className="col-6 col-sm-6 col-md-3 card-col" key={idx}>
            <div
              className="card h-100 w-100 position-relative card-hover"
              onClick={() => {
                setTenisModal(p);
                setModalAberto(true);
                setModalIndex(0);
              }}
            >
              <img
                src={p.image_link_github}
                className="card-img-top card-img-custom"
                alt={p.modelo}
              />
              <div className="card-body card-info-bg d-flex flex-column justify-content-between">
                <div>
                  <h5 className="card-title fw-semibold card-modelo mb-1">{p.modelo}</h5>
                  <p className="card-text text-muted card-marca mb-2">{p.marca}</p>
                </div>
                <div>
                  <span className="fw-bold fs-5 preco-tenis">{p["preço_venda"] || p["preco_atacado_fornecedor"]}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}