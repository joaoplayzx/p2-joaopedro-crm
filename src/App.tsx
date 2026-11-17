import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError, jsonBody } from './api';
import { useAuth } from './auth';
import { customerBadge, customerPurchaseTotal, extractList, formatCurrency, formatDate, orderDate, orderTotal, statusSummary, sumAllSales, topCustomers } from './utils';
import type { Contact, ContactChannel, Customer, CustomerPayload, Order, OrderItem, OrderStatus } from './types';

type Notice = { kind: 'error' | 'success'; text: string } | null;

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Ocorreu um erro inesperado. Tente novamente.';
}

function ErrorNotice({ notice, onClose }: { notice: Notice; onClose?: () => void }) {
  if (!notice) return null;
  return <div className={`notice ${notice.kind}`} role="status"><span>{notice.kind === 'error' ? '!' : '✓'}</span><p>{notice.text}</p>{onClose && <button className="notice-close" onClick={onClose} aria-label="Fechar aviso">×</button>}</div>;
}

function Loading({ label = 'Carregando…' }: { label?: string }) {
  return <div className="loading"><span className="spinner" />{label}</div>;
}

function Protected({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <Loading label="Verificando sua sessão…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const displayName = user?.nome ?? user?.name ?? user?.username ?? 'Atendente';
  const links = [
    { to: '/painel', label: 'Painel', icon: '▦' },
    { to: '/clientes', label: 'Clientes', icon: '♧' },
    { to: '/pedidos', label: 'Pedidos', icon: '▤' },
  ];
  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
      <Link to="/painel" className="brand" onClick={() => setMenuOpen(false)}><span className="brand-mark">v</span><span>vínculo<span className="brand-dot">.</span><small>CRM DE RELACIONAMENTO</small></span></Link>
      <div className="nav-caption">ESPAÇO DE TRABALHO</div>
      <nav className="main-nav" aria-label="Navegação principal">
        {links.map((link) => <NavLink key={link.to} to={link.to} onClick={() => setMenuOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><span className="nav-icon">{link.icon}</span>{link.label}</NavLink>)}
        <NavLink to="/clientes/novo" onClick={() => setMenuOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><span className="nav-icon plus-icon">＋</span>Novo cliente</NavLink>
      </nav>
      <div className="sidebar-bottom"><div className="user-card"><div className="avatar">{String(displayName).slice(0, 1).toUpperCase()}</div><div className="user-meta"><strong>{displayName}</strong><span>Atendente</span></div><button className="logout-icon" title="Sair" aria-label="Sair" onClick={logout}>↪</button></div><div className="sidebar-foot">Feito para cuidar de cada relação.</div></div>
    </aside>
    {menuOpen && <button className="mobile-scrim" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} />}
    <main className="main-area"><header className="mobile-header"><button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu">☰</button><Link to="/painel" className="mobile-brand">vínculo<span>.</span></Link><button className="mobile-logout" onClick={logout} aria-label="Sair">↪</button></header>{children}</main>
  </div>;
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-header"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action && <div className="header-action">{action}</div>}</div>;
}

function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon">✳</div><h3>{title}</h3><p>{text}</p>{action}</div>;
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const labels: Record<OrderStatus, string> = { aberto: 'Aberto', pago: 'Pago', cancelado: 'Cancelado' };
  return <span className={`status-badge ${status}`}>{labels[status] ?? status}</span>;
}

function Badge({ badge }: { badge: ReturnType<typeof customerBadge> }) {
  return <span className={`customer-badge ${badge === 'VIP' ? 'vip' : badge === 'Regular' ? 'regular' : 'none'}`}>{badge === 'VIP' && <span>✦ </span>}{badge}</span>;
}

function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<Notice>(location.state?.expired ? { kind: 'error', text: 'Sua sessão expirou. Entre novamente.' } : null);
  const from = (location.state as { from?: string } | null)?.from;
  useEffect(() => { if (user) navigate(from || '/painel', { replace: true }); }, [from, navigate, user]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!username.trim() || !password) { setNotice({ kind: 'error', text: 'Informe usuário e senha.' }); return; }
    setLoading(true); setNotice(null);
    try { await login(username.trim(), password); navigate(from || '/painel', { replace: true }); }
    catch (error) { setNotice({ kind: 'error', text: errorMessage(error) }); }
    finally { setLoading(false); }
  }
  return <div className="login-page"><div className="login-decoration"><div className="login-orb orb-one" /><div className="login-orb orb-two" /><div className="login-quote"><span>“</span><h2>Relacionamentos fortes<br />fazem negócios melhores.</h2><p>Seu trabalho, organizado em um só lugar.</p></div><div className="login-decoration-foot">VÍNCULO · CRM</div></div><section className="login-panel"><div className="login-form-wrap"><Link to="/login" className="brand login-brand"><span className="brand-mark">v</span><span>vínculo<span className="brand-dot">.</span><small>CRM DE RELACIONAMENTO</small></span></Link><div className="login-heading"><div className="eyebrow">BEM-VINDO DE VOLTA</div><h1>Entre na sua conta</h1><p>Acesse seu espaço de trabalho com segurança.</p></div><ErrorNotice notice={notice} onClose={() => setNotice(null)} /><form onSubmit={submit} className="form-stack"><label>Usuário<input autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Seu nome de usuário" /></label><label>Senha<input autoComplete="current-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Sua senha" /></label><button className="button primary full" disabled={loading}>{loading ? 'Entrando…' : 'Entrar'}<span>→</span></button></form><div className="login-secure">⌑ Seus dados são protegidos por autenticação segura.</div></div></section></div>;
}

function DashboardPage() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customerCount, setCustomerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice>(null);
  const refresh = useCallback(async () => {
    setLoading(true); setNotice(null);
    try {
      const [customerResult, orderResult] = await Promise.all([api<unknown>('/clientes?limit=100&skip=0'), api<unknown>('/pedidos')]);
      setCustomers(extractList<Customer>(customerResult, 'clientes'));
      setOrders(extractList<Order>(orderResult, 'pedidos'));
      const count = customerResult && typeof customerResult === 'object' ? Number((customerResult as Record<string, unknown>).total) : NaN;
      setCustomerCount(Number.isFinite(count) ? count : extractList<Customer>(customerResult, 'clientes').length);
    } catch (error) { setNotice({ kind: 'error', text: errorMessage(error) }); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const paidOpenTotal = sumAllSales(orders);
  const average = orders.filter((o) => o.status !== 'cancelado').length ? paidOpenTotal / orders.filter((o) => o.status !== 'cancelado').length : 0;
  const summaries = (['aberto', 'pago', 'cancelado'] as OrderStatus[]).map((status) => ({ status, ...statusSummary(orders, status) }));
  const best = topCustomers(customers, orders);
  const firstName = String(user?.nome ?? user?.name ?? user?.username ?? 'por aqui').split(' ')[0];
  return <div className="page-content"><PageHeader eyebrow="VISÃO GERAL" title={`Olá, ${firstName}!`} description="Acompanhe de perto o que acontece com seus clientes." action={<Link className="button primary" to="/clientes/novo"><span>＋</span> Novo cliente</Link>} /><ErrorNotice notice={notice} />
    {loading ? <Loading /> : <>
      <section className="metric-grid"><article className="metric-card"><div className="metric-top"><span>Total de clientes</span><span className="metric-icon lilac">♧</span></div><strong>{customerCount}</strong><small>em sua carteira</small></article><article className="metric-card"><div className="metric-top"><span>Total vendido</span><span className="metric-icon mint">↗</span></div><strong>{formatCurrency(paidOpenTotal)}</strong><small>sem pedidos cancelados</small></article><article className="metric-card"><div className="metric-top"><span>Ticket médio</span><span className="metric-icon peach">⌁</span></div><strong>{formatCurrency(average)}</strong><small>por pedido válido</small></article></section>
      <div className="dashboard-grid"><section className="panel status-panel"><div className="section-heading"><div><h2>Pedidos por status</h2><p>Visão geral do seu fluxo de vendas</p></div><Link to="/pedidos" className="text-link">Ver pedidos <span>→</span></Link></div><div className="status-list">{summaries.map((item) => <div className="status-row" key={item.status}><div className="status-label"><span className={`status-dot ${item.status}`} /> <span>{item.status[0].toUpperCase() + item.status.slice(1)}</span></div><strong>{item.count}</strong><span className="status-value">{formatCurrency(item.total)}</span></div>)}</div></section>
        <section className="panel top-panel"><div className="section-heading"><div><h2>Clientes em destaque</h2><p>Top 3 por valor comprado</p></div><span className="trophy">✦</span></div>{best.length ? <div className="top-list">{best.map(({ customer, total }, index) => <Link className="top-customer" to={`/clientes/${customer.id}`} key={customer.id}><span className={`rank rank-${index + 1}`}>0{index + 1}</span><span className="top-avatar">{customer.nome?.slice(0, 1).toUpperCase() || '?'}</span><span className="top-customer-name"><strong>{customer.nome}</strong><small>{customer.empresa || customer.cidade || 'Cliente'}</small></span><strong className="top-amount">{formatCurrency(total)}</strong></Link>)}</div> : <div className="small-empty">Seus clientes com compras aparecerão aqui.</div>}</section>
      </div>
      <section className="welcome-strip"><div className="welcome-spark">✦</div><div><strong>Um bom atendimento começa com contexto.</strong><p>Registre conversas e mantenha cada detalhe importante por perto.</p></div><Link to="/clientes" className="text-link">Explorar clientes <span>→</span></Link></section>
    </>}
  </div>;
}

function CustomersPage() {
  const navigate = useNavigate();
  const requestVersion = useRef(0);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice>(null);
  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true); setNotice(null);
    try {
      const params = new URLSearchParams({ limit: '5', skip: String(page * 5) });
      if (query.trim()) params.set('q', query.trim());
      const [clientResponse, orderResponse] = await Promise.all([api<unknown>(`/clientes?${params}`), api<unknown>('/pedidos')]);
      if (version !== requestVersion.current) return;
      setCustomers(extractList<Customer>(clientResponse, 'clientes'));
      setOrders(extractList<Order>(orderResponse, 'pedidos'));
      const count = clientResponse && typeof clientResponse === 'object' ? Number((clientResponse as Record<string, unknown>).total) : NaN;
      setTotal(Number.isFinite(count) ? count : extractList<Customer>(clientResponse, 'clientes').length);
    } catch (error) { if (version === requestVersion.current) setNotice({ kind: 'error', text: errorMessage(error) }); }
    finally { if (version === requestVersion.current) setLoading(false); }
  }, [page, query]);
  useEffect(() => { void load(); }, [load]);
  const pages = Math.max(1, Math.ceil(total / 5));
  return <div className="page-content"><PageHeader eyebrow="SUA CARTEIRA" title="Clientes" description="Todas as relações importantes, em um só lugar." action={<Link className="button primary" to="/clientes/novo"><span>＋</span> Novo cliente</Link>} />
    <section className="panel table-panel"><div className="table-toolbar"><label className="search-box"><span>⌕</span><input aria-label="Buscar clientes" placeholder="Buscar por nome ou e-mail…" value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} /><kbd>⌘ K</kbd></label><span className="result-count">{total} {total === 1 ? 'cliente' : 'clientes'}</span></div><ErrorNotice notice={notice} />
      {loading ? <Loading /> : customers.length ? <><div className="table-wrap"><table><thead><tr><th>CLIENTE</th><th>EMPRESA / CIDADE</th><th>CONTATO</th><th>SELO</th><th /></tr></thead><tbody>{customers.map((customer) => <tr key={customer.id} onClick={() => navigate(`/clientes/${customer.id}`)} className="click-row"><td><div className="customer-cell"><div className="customer-avatar">{customer.nome?.slice(0, 1).toUpperCase() || '?'}</div><div><strong>{customer.nome}</strong><small>{customer.email}</small></div></div></td><td><span className="muted-cell">{customer.empresa || customer.cidade || '—'}</span></td><td><span className="muted-cell">{customer.telefone || '—'}</span></td><td><Badge badge={customerBadge(customer.id, orders)} /></td><td><Link to={`/clientes/${customer.id}`} className="row-arrow" aria-label={`Abrir ${customer.nome}`} onClick={(event) => event.stopPropagation()}>↗</Link></td></tr>)}</tbody></table></div><div className="pagination"><span>Mostrando {Math.min(total, page * 5 + 1)}–{Math.min(total, page * 5 + customers.length)} de {total}</span><div><button className="page-button" disabled={page === 0} onClick={() => setPage((current) => current - 1)}>←</button><span className="page-current">{page + 1} / {pages}</span><button className="page-button" disabled={page + 1 >= pages} onClick={() => setPage((current) => current + 1)}>→</button></div></div></> : <EmptyState title={query ? 'Nenhum resultado encontrado' : 'Sua carteira começa aqui'} text={query ? 'Tente buscar por outro nome ou e-mail.' : 'Cadastre seu primeiro cliente para começar a organizar seus relacionamentos.'} action={!query && <Link className="button secondary" to="/clientes/novo">＋ Cadastrar cliente</Link>} />}
    </section>
  </div>;
}

function CustomerFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [values, setValues] = useState<CustomerPayload>({ nome: '', email: '', telefone: '', empresa: '', cidade: '' });
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  useEffect(() => {
    if (!id) return;
    let active = true;
    api<unknown>(`/clientes/${id}`).then((payload) => {
      const record = payload && typeof payload === 'object' && 'cliente' in payload ? (payload as { cliente: Customer }).cliente : payload as Customer;
      if (active && record) setValues({ nome: record.nome ?? '', email: record.email ?? '', telefone: record.telefone ?? '', empresa: record.empresa ?? '', cidade: record.cidade ?? '' });
    }).catch((error) => { if (active) setNotice({ kind: 'error', text: errorMessage(error) }); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);
  function update(key: keyof CustomerPayload, value: string) { setValues((current) => ({ ...current, [key]: value })); }
  async function submit(event: FormEvent) {
    event.preventDefault(); setNotice(null);
    const email = values.email.trim();
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const extraFields = [values.telefone, values.empresa, values.cidade].filter((value) => Boolean(value?.trim())).length;
    if (!values.nome.trim()) { setNotice({ kind: 'error', text: 'Informe o nome do cliente.' }); return; }
    if (!validEmail) { setNotice({ kind: 'error', text: 'Informe um e-mail válido.' }); return; }
    if (extraFields < 2) { setNotice({ kind: 'error', text: 'Preencha pelo menos dois destes campos: telefone, empresa e cidade.' }); return; }
    const payload: CustomerPayload = { nome: values.nome.trim(), email, telefone: values.telefone?.trim(), empresa: values.empresa?.trim(), cidade: values.cidade?.trim() };
    setSaving(true);
    try {
      const result = await api<unknown>(editing ? `/clientes/${id}` : '/clientes', { method: editing ? 'PATCH' : 'POST', body: jsonBody(payload) });
      const customer = result && typeof result === 'object' && 'cliente' in result ? (result as { cliente: Customer }).cliente : result as Customer;
      navigate(editing ? `/clientes/${id}` : `/clientes/${customer?.id ?? ''}`, { replace: true });
    } catch (error) { setNotice({ kind: 'error', text: errorMessage(error) }); }
    finally { setSaving(false); }
  }
  return <div className="page-content narrow-page"><div className="breadcrumbs"><Link to="/clientes">Clientes</Link><span>/</span><span>{editing ? 'Editar cliente' : 'Novo cliente'}</span></div><PageHeader eyebrow={editing ? 'ATUALIZE OS DADOS' : 'AMPLIE SUA CARTEIRA'} title={editing ? 'Editar cliente' : 'Novo cliente'} description="Dados corretos ajudam você a cuidar melhor de cada relação." /><section className="panel form-panel">{loading ? <Loading /> : <><ErrorNotice notice={notice} /><form onSubmit={submit} className="form-stack"><div className="form-section-title"><span>01</span><div><strong>Informações principais</strong><small>Nome e e-mail são obrigatórios.</small></div></div><div className="field-grid"><label className="field-wide">Nome completo *<input value={values.nome} onChange={(e) => update('nome', e.target.value)} placeholder="Ex.: Marina Costa" /></label><label className="field-wide">E-mail *<input type="email" value={values.email} onChange={(e) => update('email', e.target.value)} placeholder="marina@empresa.com" /></label></div><div className="form-section-title second"><span>02</span><div><strong>Como encontrar</strong><small>Preencha pelo menos dois campos abaixo.</small></div></div><div className="field-grid"><label>Telefone<input value={values.telefone} onChange={(e) => update('telefone', e.target.value)} placeholder="(11) 99999-9999" /></label><label>Empresa<input value={values.empresa} onChange={(e) => update('empresa', e.target.value)} placeholder="Nome da empresa" /></label><label className="field-wide">Cidade<input value={values.cidade} onChange={(e) => update('cidade', e.target.value)} placeholder="Cidade" /></label></div><div className="form-actions"><Link className="button ghost" to={editing ? `/clientes/${id}` : '/clientes'}>Cancelar</Link><button className="button primary" disabled={saving}>{saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Cadastrar cliente'}<span>→</span></button></div></form></>}</section></div>;
}

function OrderEditor({ initial, saving, onSave, onCancel }: { initial?: OrderItem[]; saving: boolean; onSave: (items: OrderItem[]) => void; onCancel: () => void }) {
  const [items, setItems] = useState<OrderItem[]>(initial?.length ? initial.map((item) => ({ ...item })) : [{ titulo: '', preco: 0, quantidade: 1 }]);
  const [error, setError] = useState('');
  function setItem(index: number, key: keyof OrderItem, value: string) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: key === 'titulo' ? value : Number(value) } : item));
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!items.length || items.some((item) => !item.titulo.trim() || !Number.isFinite(item.preco) || item.preco < 0 || !Number.isInteger(item.quantidade) || item.quantidade < 1)) {
      setError('Preencha o título, preço (a partir de R$ 0,00) e quantidade inteira (mínimo 1) de cada item.'); return;
    }
    setError(''); onSave(items.map((item) => ({ ...item, titulo: item.titulo.trim() })));
  }
  return <form className="inline-editor" onSubmit={submit}><div className="inline-editor-heading"><strong>{initial ? 'Editar itens do pedido' : 'Novo pedido'}</strong><button type="button" className="icon-button" onClick={onCancel} aria-label="Fechar">×</button></div>{items.map((item, index) => <div className="item-edit-row" key={index}><label>Item<input value={item.titulo} onChange={(e) => setItem(index, 'titulo', e.target.value)} placeholder="Ex.: Consultoria" /></label><label>Preço (R$)<input type="number" min="0" step="0.01" value={item.preco} onChange={(e) => setItem(index, 'preco', e.target.value)} /></label><label>Qtd.<input type="number" min="1" step="1" value={item.quantidade} onChange={(e) => setItem(index, 'quantidade', e.target.value)} /></label>{items.length > 1 && <button type="button" className="remove-item" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="Remover item">×</button>}</div>)}<button type="button" className="text-link add-item" onClick={() => setItems((current) => [...current, { titulo: '', preco: 0, quantidade: 1 }])}>＋ Adicionar item</button>{error && <p className="inline-error">{error}</p>}<div className="editor-actions"><button type="button" className="button ghost small-button" onClick={onCancel}>Cancelar</button><button className="button primary small-button" disabled={saving}>{saving ? 'Salvando…' : 'Salvar pedido'}</button></div></form>;
}

function ContactEditor({ initial, saving, onSave, onCancel }: { initial?: Contact; saving: boolean; onSave: (contact: Pick<Contact, 'titulo' | 'texto' | 'canal'>) => void; onCancel: () => void }) {
  const [titulo, setTitulo] = useState(initial?.titulo ?? '');
  const [texto, setTexto] = useState(initial?.texto ?? '');
  const [canal, setCanal] = useState<ContactChannel>(initial?.canal ?? 'telefone');
  const [error, setError] = useState('');
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!titulo.trim() || !texto.trim()) { setError('Preencha o título e o resumo do atendimento.'); return; }
    setError(''); onSave({ titulo: titulo.trim(), texto: texto.trim(), canal });
  }
  return <form className="inline-editor" onSubmit={submit}><div className="inline-editor-heading"><strong>{initial ? 'Editar atendimento' : 'Novo atendimento'}</strong><button type="button" className="icon-button" onClick={onCancel} aria-label="Fechar">×</button></div><div className="field-grid"><label>Título<input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Retorno sobre proposta" /></label><label>Canal<select value={canal} onChange={(e) => setCanal(e.target.value as ContactChannel)}><option value="telefone">Telefone</option><option value="e-mail">E-mail</option><option value="WhatsApp">WhatsApp</option><option value="presencial">Presencial</option></select></label><label className="field-wide">Resumo<textarea rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="O que foi conversado?" /></label></div>{error && <p className="inline-error">{error}</p>}<div className="editor-actions"><button type="button" className="button ghost small-button" onClick={onCancel}>Cancelar</button><button className="button primary small-button" disabled={saving}>{saving ? 'Salvando…' : 'Salvar atendimento'}</button></div></form>;
}

function CustomerDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice>(null);
  const [orderEditor, setOrderEditor] = useState<{ order?: Order } | null>(null);
  const [contactEditor, setContactEditor] = useState<{ contact?: Contact } | null>(null);
  const [busy, setBusy] = useState(false);
  const [channel, setChannel] = useState('todos');
  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setNotice(null);
    try {
      const [clientData, orderData, contactData] = await Promise.all([
        api<unknown>(`/clientes/${id}`), api<unknown>(`/clientes/${id}/pedidos`), api<unknown>(`/clientes/${id}/atendimentos`),
      ]);
      const record = clientData && typeof clientData === 'object' && 'cliente' in clientData ? (clientData as { cliente: Customer }).cliente : clientData as Customer;
      setCustomer(record ?? null); setOrders(extractList<Order>(orderData, 'pedidos'));
      const orderedContacts = extractList<Contact>(contactData, 'atendimentos').sort((a, b) => new Date(b.createdAt ?? b.created_at ?? b.data ?? 0).getTime() - new Date(a.createdAt ?? a.created_at ?? a.data ?? 0).getTime());
      setContacts(orderedContacts);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) setCustomer(null);
      else setNotice({ kind: 'error', text: errorMessage(error) });
    } finally { setLoading(false); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);
  const refresh = () => load(false);
  async function deleteCustomer() {
    const ok = window.confirm(`Excluir ${customer?.nome}? ${orders.length} pedido(s) e ${contacts.length} atendimento(s) também serão apagados. Esta ação não pode ser desfeita.`);
    if (!ok) return;
    setBusy(true); setNotice(null);
    try { await api(`/clientes/${id}`, { method: 'DELETE' }); navigate('/clientes', { replace: true }); }
    catch (error) { setNotice({ kind: 'error', text: errorMessage(error) }); }
    finally { setBusy(false); }
  }
  async function saveOrder(items: OrderItem[]) {
    setBusy(true); setNotice(null);
    try {
      if (orderEditor?.order) await api(`/pedidos/${orderEditor.order.id}`, { method: 'PATCH', body: jsonBody({ itens: items }) });
      else await api(`/clientes/${id}/pedidos`, { method: 'POST', body: jsonBody({ itens: items }) });
      setOrderEditor(null); await refresh();
    } catch (error) { setNotice({ kind: 'error', text: errorMessage(error) }); }
    finally { setBusy(false); }
  }
  async function changeStatus(order: Order, status: OrderStatus) {
    setBusy(true); setNotice(null);
    try { await api(`/pedidos/${order.id}`, { method: 'PATCH', body: jsonBody({ status }) }); await refresh(); }
    catch (error) { setNotice({ kind: 'error', text: errorMessage(error) }); }
    finally { setBusy(false); }
  }
  async function removeOrder(order: Order) {
    if (!window.confirm('Excluir este pedido? Esta ação não pode ser desfeita.')) return;
    setBusy(true); setNotice(null);
    try { await api(`/pedidos/${order.id}`, { method: 'DELETE' }); await refresh(); }
    catch (error) { setNotice({ kind: 'error', text: errorMessage(error) }); }
    finally { setBusy(false); }
  }
  async function saveContact(value: Pick<Contact, 'titulo' | 'texto' | 'canal'>) {
    setBusy(true); setNotice(null);
    try {
      if (contactEditor?.contact) await api(`/atendimentos/${contactEditor.contact.id}`, { method: 'PATCH', body: jsonBody(value) });
      else await api(`/clientes/${id}/atendimentos`, { method: 'POST', body: jsonBody(value) });
      setContactEditor(null); await refresh();
    } catch (error) { setNotice({ kind: 'error', text: errorMessage(error) }); }
    finally { setBusy(false); }
  }
  async function removeContact(contact: Contact) {
    if (!window.confirm('Excluir este registro de atendimento?')) return;
    setBusy(true); setNotice(null);
    try { await api(`/atendimentos/${contact.id}`, { method: 'DELETE' }); await refresh(); }
    catch (error) { setNotice({ kind: 'error', text: errorMessage(error) }); }
    finally { setBusy(false); }
  }
  const filteredContacts = useMemo(() => channel === 'todos' ? contacts : contacts.filter((contact) => contact.canal === channel), [channel, contacts]);
  if (loading) return <div className="page-content"><Loading /></div>;
  if (!customer) return <div className="page-content"><div className="breadcrumbs"><Link to="/clientes">Clientes</Link><span>/</span><span>Detalhe</span></div><EmptyState title="Cliente não encontrado" text="Este cliente não existe ou foi removido." action={<Link className="button secondary" to="/clientes">Voltar para clientes</Link>} /></div>;
  return <div className="page-content"><div className="breadcrumbs"><Link to="/clientes">Clientes</Link><span>/</span><span>{customer.nome}</span></div><ErrorNotice notice={notice} />
    <section className="customer-hero panel"><div className="hero-avatar">{customer.nome?.slice(0, 1).toUpperCase()}</div><div className="hero-info"><div className="hero-name-line"><h1>{customer.nome}</h1><Badge badge={customerBadge(customer.id, orders)} /></div><p>{customer.empresa || 'Pessoa física'}{customer.cidade ? ` · ${customer.cidade}` : ''}</p><div className="hero-contact"><span>✉ {customer.email}</span>{customer.telefone && <span>⌕ {customer.telefone}</span>}</div></div><div className="hero-actions"><Link className="button secondary" to={`/clientes/${id}/editar`}>✎ <span>Editar</span></Link><button className="button danger-ghost" disabled={busy} onClick={() => void deleteCustomer()}>Excluir</button></div></section>
    <section className="detail-summary"><div><span>Compras válidas</span><strong>{formatCurrency(customerPurchaseTotal(customer.id, orders))}</strong></div><div><span>Pedidos</span><strong>{orders.length}</strong></div><div><span>Atendimentos</span><strong>{contacts.length}</strong></div></section>
    <section className="panel detail-panel"><div className="section-heading"><div><h2>Pedidos</h2><p>Compras e oportunidades deste cliente.</p></div><button className="button primary small-button" onClick={() => setOrderEditor({})}>＋ Novo pedido</button></div><ErrorNotice notice={notice} />{orderEditor && <OrderEditor initial={orderEditor.order?.itens} saving={busy} onSave={(items) => void saveOrder(items)} onCancel={() => setOrderEditor(null)} />}
      {orders.length ? <div className="order-list">{orders.map((order) => <article className="order-card" key={order.id}><div className="order-main"><div className="order-icon">▤</div><div><div className="order-title-line"><strong>Pedido #{order.id}</strong><StatusBadge status={order.status} /></div><small>{formatDate(orderDate(order))} · {order.itens?.length ?? 0} {(order.itens?.length ?? 0) === 1 ? 'item' : 'itens'}</small><div className="order-items-preview">{order.itens?.map((item) => `${item.titulo} × ${item.quantidade}`).join(' · ')}</div></div></div><div className="order-side"><strong>{formatCurrency(orderTotal(order.itens))}</strong><div className="order-actions">{order.status === 'aberto' && <button disabled={busy} onClick={() => setOrderEditor({ order })}>Editar itens</button>}{order.status === 'aberto' && <button disabled={busy} onClick={() => void changeStatus(order, 'pago')}>Marcar pago</button>}{order.status !== 'cancelado' && <button disabled={busy} onClick={() => void changeStatus(order, 'cancelado')}>Cancelar</button>}<button disabled={busy} className="delete-action" onClick={() => void removeOrder(order)}>Excluir</button></div></div></article>)}</div> : !orderEditor && <EmptyState title="Nenhum pedido ainda" text="Registre o primeiro pedido deste cliente para acompanhar valores e status." action={<button className="button secondary" onClick={() => setOrderEditor({})}>＋ Criar primeiro pedido</button>} />}</section>
    <section className="panel detail-panel"><div className="section-heading"><div><h2>Histórico de atendimento</h2><p>Um registro claro para cada conversa.</p></div><button className="button primary small-button" onClick={() => setContactEditor({})}>＋ Registrar contato</button></div><div className="contact-toolbar"><label>Filtrar por canal<select value={channel} onChange={(e) => setChannel(e.target.value)}><option value="todos">Todos os canais</option><option value="telefone">Telefone</option><option value="e-mail">E-mail</option><option value="WhatsApp">WhatsApp</option><option value="presencial">Presencial</option></select></label><span className="result-count">{filteredContacts.length} {filteredContacts.length === 1 ? 'atendimento' : 'atendimentos'}</span></div>{contactEditor && <ContactEditor initial={contactEditor.contact} saving={busy} onSave={(value) => void saveContact(value)} onCancel={() => setContactEditor(null)} />}{filteredContacts.length ? <div className="timeline">{filteredContacts.map((contact) => <article className="timeline-entry" key={contact.id}><div className="timeline-pin">{contact.canal === 'telefone' ? '⌕' : contact.canal === 'e-mail' ? '✉' : contact.canal === 'WhatsApp' ? '◉' : '⌂'}</div><div className="timeline-content"><div className="timeline-heading"><div><strong>{contact.titulo}</strong><span className="channel-tag">{contact.canal}</span></div><time>{formatDate(contact.createdAt ?? contact.created_at ?? contact.data)}</time></div><p>{contact.texto}</p><div className="timeline-actions"><button onClick={() => setContactEditor({ contact })}>Editar</button><button className="delete-action" onClick={() => void removeContact(contact)}>Excluir</button></div></div></article>)}</div> : !contactEditor && <div className="small-empty">{channel === 'todos' ? 'Nenhum atendimento registrado.' : 'Nenhum atendimento neste canal.'}</div>}</section>
  </div>;
}

function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [status, setStatus] = useState('todos');
  const [minimum, setMinimum] = useState('');
  const [maximum, setMaximum] = useState('');
  const [sort, setSort] = useState('recentes');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice>(null);
  useEffect(() => {
    let active = true;
    Promise.all([api<unknown>('/pedidos'), api<unknown>('/clientes?limit=100&skip=0')])
      .then(([ordersData, customersData]) => { if (active) { setOrders(extractList<Order>(ordersData, 'pedidos')); setCustomers(extractList<Customer>(customersData, 'clientes')); } })
      .catch((error) => { if (active) setNotice({ kind: 'error', text: errorMessage(error) }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const customerById = useMemo(() => new Map(customers.map((customer) => [String(customer.id), customer])), [customers]);
  const visible = useMemo(() => orders.filter((order) => {
    const total = orderTotal(order.itens);
    return (status === 'todos' || order.status === status) && (minimum === '' || total >= Number(minimum)) && (maximum === '' || total <= Number(maximum));
  }).sort((a, b) => sort === 'valor-maior' ? orderTotal(b.itens) - orderTotal(a.itens) : sort === 'valor-menor' ? orderTotal(a.itens) - orderTotal(b.itens) : sort === 'antigos' ? new Date(orderDate(a)).getTime() - new Date(orderDate(b)).getTime() : new Date(orderDate(b)).getTime() - new Date(orderDate(a)).getTime()), [orders, status, minimum, maximum, sort]);
  return <div className="page-content"><PageHeader eyebrow="ACOMPANHAMENTO DE VENDAS" title="Pedidos" description="Todos os pedidos da sua carteira, organizados em um só lugar." />
    <section className="panel table-panel"><div className="filter-toolbar"><label>Status<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="todos">Todos</option><option value="aberto">Aberto</option><option value="pago">Pago</option><option value="cancelado">Cancelado</option></select></label><label>Valor mínimo<input type="number" min="0" step="0.01" placeholder="R$ 0" value={minimum} onChange={(e) => setMinimum(e.target.value)} /></label><label>Valor máximo<input type="number" min="0" step="0.01" placeholder="Sem limite" value={maximum} onChange={(e) => setMaximum(e.target.value)} /></label><label>Ordenar por<select value={sort} onChange={(e) => setSort(e.target.value)}><option value="recentes">Data: mais recente</option><option value="antigos">Data: mais antiga</option><option value="valor-maior">Total: maior</option><option value="valor-menor">Total: menor</option></select></label></div><ErrorNotice notice={notice} />
      {loading ? <Loading /> : visible.length ? <><div className="table-wrap"><table><thead><tr><th>PEDIDO</th><th>CLIENTE</th><th>DATA</th><th>STATUS</th><th className="align-right">TOTAL</th></tr></thead><tbody>{visible.map((order) => { const clientId = order.clienteId ?? order.cliente_id; const customer = customerById.get(String(clientId)); return <tr key={order.id} className="click-row" onClick={() => customer && navigate(`/clientes/${customer.id}`)}><td><strong>#{order.id}</strong><small className="table-sub">{order.itens?.length ?? 0} {(order.itens?.length ?? 0) === 1 ? 'item' : 'itens'}</small></td><td>{customer ? <Link className="inline-customer" to={`/clientes/${customer.id}`} onClick={(event) => event.stopPropagation()}>{customer.nome}<span>↗</span></Link> : <span className="muted-cell">Cliente não identificado</span>}</td><td>{formatDate(orderDate(order))}</td><td><StatusBadge status={order.status} /></td><td className="align-right"><strong>{formatCurrency(orderTotal(order.itens))}</strong></td></tr>; })}</tbody></table></div><div className="pagination"><span>{visible.length} {visible.length === 1 ? 'pedido' : 'pedidos'} encontrados</span></div></> : <EmptyState title="Nenhum pedido encontrado" text="Ajuste os filtros ou registre pedidos no detalhe de um cliente." />}
    </section>
  </div>;
}

function NotFoundPage() {
  return <div className="page-content not-found"><div className="not-found-mark">404</div><div className="eyebrow">PÁGINA NÃO ENCONTRADA</div><h1>Este caminho não existe.</h1><p>Talvez o endereço tenha mudado. Vamos voltar para um lugar conhecido?</p><Link className="button primary" to="/painel">Ir para o painel <span>→</span></Link></div>;
}

export default function App() {
  const { user } = useAuth();
  const authed = Boolean(user);
  return <Routes>
    <Route path="/login" element={authed ? <Navigate to="/painel" replace /> : <LoginPage />} />
    <Route path="*" element={<Protected><Layout><Routes>
      <Route path="/" element={<Navigate to="/painel" replace />} />
      <Route path="/painel" element={<DashboardPage />} />
      <Route path="/clientes" element={<CustomersPage />} />
      <Route path="/clientes/novo" element={<CustomerFormPage />} />
      <Route path="/clientes/:id/editar" element={<CustomerFormPage />} />
      <Route path="/clientes/:id" element={<CustomerDetailPage />} />
      <Route path="/pedidos" element={<OrdersPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes></Layout></Protected>} />
  </Routes>;
}
