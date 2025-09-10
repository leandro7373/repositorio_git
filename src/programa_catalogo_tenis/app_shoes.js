import React, { useState, useEffect, useRef } from "react";
import Papa from "papaparse";
import "./app_shoes.css";

const CSV_URL = "https://raw.githubusercontent.com/leandro7373/repositorio_git/main/CSV_principal/todos_os_pares_unico_tenis__com_links_github.csv";

function fetchCSV(url, callback) {
  Papa.parse(url, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: (results) => callback(results.data),
  });
}

export default function CatalogoTenis() {
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState("");
  const [carrinho, setCarrinho] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [marcaSelecionada, setMarcaSelecionada] = useState("");
  const [valores, setValores] = useState([0, 1000]);
  const [ultimosExibidos, setUltimosExibidos] = useState([]);
  const isFirstRender = useRef(true);

  // Estado para numeração e quantidade no carrinho
  const [itensCarrinho, setItensCarrinho] = useState([]);

  useEffect(() => {
    fetchCSV(CSV_URL, (data) => {
      setProdutos(data);
      const precos = data.map((p) => {
        const valor = p["preço_venda"] || p["preco_atacado_fornecedor"] || "0";
        return Number(valor.replace("R$", "").replace(",", "."));
      }).filter((v) => !isNaN(v));
      const min = Math.min(...precos);
      const max = Math.max(...precos);
      setValores([min, max]);
      setUltimosExibidos(data); // Inicialmente, mostra todos
    });
  }, []);

  // Sempre que a busca ou marca mudar, atualiza os exibidos apenas se houver resultados
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
    // Se não houver resultados, não altera ultimosExibidos (mantém os últimos exibidos)
  }, [busca, produtos, valores, marcaSelecionada]);

  // Atualiza itensCarrinho sempre que carrinho mudar
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

  function Carrinho() {
    const total = itensCarrinho.reduce((acc, p) => {
      const valor = p["preço_venda"] || p["preco_atacado_fornecedor"] || "0";
      return acc + Number(valor.replace("R$", "").replace(",", ".")) * (Number(p.quantidade) || 1);
    }, 0);

    // Função para enviar o pedido via WhatsApp
    function enviarPedido() {
      const mensagem = itensCarrinho.map((p, idx) => (
        `• Código: ${p["cód.tenis"] || "-"}\n` +
        `Marca: ${p.marca}\n` +
        `Modelo: ${p.modelo}\n` +
        `Numeração: ${p.numeracao || "-"}\n` +
        `Quantidade: ${p.quantidade || 1}\n` +
        `Valor: ${p["preço_venda"] || p["preco_atacado_fornecedor"]}\n`
      )).join('\n----------------------\n');
      const texto = `Olá! Gostaria de fazer um pedido:\n\n${mensagem}\nTotal: R$ ${total.toFixed(2)}`;
      const url = `https://wa.me/5531983581412?text=${encodeURIComponent(texto)}`;
      window.open(url, "_blank");
    }

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
                    <label style={{ fontSize: "0.85em" }}>Numeração:</label>
                    <input
                      type="text"
                      value={p.numeracao}
                      onChange={e => atualizarItemCarrinho(idx, "numeracao", e.target.value)}
                      style={{ width: 48, fontSize: "0.9em" }}
                    />
                    <label style={{ fontSize: "0.85em", marginLeft: 6 }}>Qtd:</label>
                    <input
                      type="number"
                      min={1}
                      value={p.quantidade}
                      onChange={e => atualizarItemCarrinho(idx, "quantidade", e.target.value)}
                      style={{ width: 40, fontSize: "0.9em" }}
                    />
                  </div>
                </div>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => removeCarrinho(idx)}
                  title="Remover"
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
              style={{ minWidth: 180, fontWeight: 600, fontSize: "1.1rem" }}
              onClick={enviarPedido}
              disabled={itensCarrinho.length === 0}
            >
              Enviar Pedido
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Menu lateral para seleção de marcas
  function MenuMarcas() {
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
              style={{ cursor: "pointer" }}
              onClick={() => { setMarcaSelecionada(""); setMenuOpen(false); }}
            >
              Todas as marcas
            </li>
            {marcas.map((marca) => (
              <li
                key={marca}
                className={`list-group-item${marcaSelecionada === marca ? " active" : ""}`}
                style={{ cursor: "pointer" }}
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

  // Busca atual sem filtro (para mostrar mensagem)
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
      {/* Barra superior fixa com logo à esquerda, menu à direita e sacola ao lado do menu */}
      <div className="sticky-top bg-white d-flex align-items-center justify-content-between px-2"
        style={{height: 72, zIndex: 1100, borderBottom: "1px solid #eee"}}>
        {/* Logo do lado esquerdo */}
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
        {/* Menu hamburguer totalmente à direita, sacola ao lado do menu */}
        <div className="d-flex align-items-center gap-3">
          {/* Sacola (à esquerda do menu) */}
          <button
            className="btn btn-link p-0 position-relative"
            style={{height: 44}}
            onClick={() => setDrawerOpen(true)}
          >
            <i className="bi bi-bag" style={{fontSize: "2rem"}}></i>
            {carrinho.length > 0 && (
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                {carrinho.length}
              </span>
            )}
          </button>
          {/* Menu hamburguer (totalmente à direita) */}
          <button
            className="btn btn-link p-0"
            style={{height: 44}}
            onClick={() => setMenuOpen(true)}
          >
            <i className="bi bi-list" style={{fontSize: "2.2rem"}}></i>
          </button>
        </div>
      </div>
      {/* Barra de pesquisa */}
      <div className="barra-pesquisa-sticky py-2">
        <div className="input-group">
          <span className="input-group-text" id="search-icon" style={{height: 40}}>
            <i className="bi bi-search"></i>
          </span>
          <input
            type="text"
            className="form-control"
            placeholder="Busca"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            aria-label="Buscar"
            aria-describedby="search-icon"
            style={{height: 40}}
          />
        </div>
        {/* Mensagem de item não encontrado */}
        {produtos.length > 0 && filtrados.length === 0 && busca !== "" && (
          <div className="text-danger mt-2" style={{fontWeight: 500, fontSize: '1rem'}}>
            Item não encontrado
          </div>
        )}
      </div>
      {/* Carrinho lateral */}
      <Carrinho />
      {/* Menu lateral de marcas */}
      <MenuMarcas />
      {/* Overlay escurecido para qualquer barra lateral aberta */}
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
            setDrawerOpen(false);
            setMenuOpen(false);
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
            >
              {/* Ícone da sacolinha */}
              <div
                className="sacola-circulo"
                title="Adicionar ao Carrinho"
                onClick={e => {
                  e.stopPropagation();
                  addCarrinho(p);
                }}
              >
                <i className="bi bi-bag"></i>
              </div>
              <img
                src={p.image_link_github}
                className="card-img-top"
                alt={p.modelo}
                style={{ height: 210, objectFit: "cover" }}
              />
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