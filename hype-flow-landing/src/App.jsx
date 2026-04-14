import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useSpring, useInView } from 'framer-motion';
import Lenis from '@studio-freight/lenis';
import { 
  Bot, Zap, TrendingUp, CheckCircle, ArrowRight, UserCheck, 
  Database, Fingerprint, Users, ShieldCheck, Rocket, 
  Menu, X, Plus, ArrowDown, Layout, Repeat, TrendingDown,
  MessageSquare, Mail, Smartphone, BarChart, Phone, Target, Star
} from 'lucide-react';

// --- DESIGN SYSTEM & TOKENS ---
const theme = {
  bg: '#050D14',
  surf: '#0C1824',
  prim: '#21A0C4',
  accent: '#4FC8EA',
  text1: '#EBF4FF',
  text2: '#7FA8C4',
  text3: '#3D6080',
  success: '#1EC87A',
  warning: '#F5A623',
  danger: '#E84545',
  h: '#4FC8EA',
  y: '#F5A623',
  p: '#E84545',
  e: '#1EC87A',
  grid: 'linear-gradient(to right, rgba(33, 160, 196, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(33, 160, 196, 0.05) 1px, transparent 1px)'
};

const fup = { 
  initial: { opacity: 0, y: 30 }, 
  whileInView: { opacity: 1, y: 0 }, 
  viewport: { once: true, margin: "-100px" }, 
  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } 
};

// --- CORE UI COMPONENTS ---

const Navbar = () => {
  const [s, setS] = useState(false);
  const [m, setM] = useState(false);
  useEffect(() => {
    const sc = () => setS(window.scrollY > 50);
    window.addEventListener('scroll', sc);
    return () => window.removeEventListener('scroll', sc);
  }, []);
  
  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: s ? '12px 24px' : '32px 24px', transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 32px', borderRadius: '20px', backgroundColor: s ? 'rgba(5, 13, 20, 0.98)' : 'transparent', backdropFilter: s ? 'blur(16px)' : 'none', border: s ? '1px solid rgba(255, 255, 255, 0.08)' : 'none', boxShadow: s ? '0 20px 40px rgba(0,0,0,0.4)' : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontFamily: 'Syne', fontWeight: 800, fontSize: '24px', color: '#fff', letterSpacing: '-1px' }}>
          <Fingerprint color={theme.prim} size={32} /> HYPE FLOW
        </div>
        <div className="hidden md:flex" style={{ gap: '40px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '3px', color: theme.text2 }}>
          {['Método', 'Nicho', 'Portal', 'Resultados'].map(item => <a key={item} href={`#${item.toLowerCase()}`} style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.3s' }}>{item}</a>)}
        </div>
        <button style={{ backgroundColor: theme.prim, color: theme.bg, border: 'none', padding: '12px 32px', borderRadius: '12px', fontFamily: 'Syne', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', cursor: 'pointer', transition: 'transform 0.3s' }}>Diagnóstico Gratuito</button>
        <button className="md:hidden" style={{ background: 'none', border: 'none', color: theme.prim }} onClick={() => setM(true)}><Menu size={28} /></button>
      </div>
      <AnimatePresence>
        {m && (
          <motion.div initial={{ opacity: 0, x: '100%' }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: '100%' }} style={{ position: 'fixed', inset: 0, backgroundColor: theme.bg, zIndex: 110, padding: '48px', display: 'flex', flexDirection: 'column' }}>
            <button style={{ alignSelf: 'flex-end', background: 'none', border: 'none', color: theme.prim, marginBottom: '64px' }} onClick={() => setM(false)}><X size={40} /></button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', fontFamily: 'Syne', fontWeight: 800, fontSize: '40px' }}>
              {['Método', 'Nicho', 'Portal', 'Resultados'].map(item => <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setM(false)} style={{ color: '#fff', textDecoration: 'none' }}>{item}</a>)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

// --- SECTIONS ---

const Hero = () => (
  <section style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', textAlign: 'center', padding: '0 24px' }}>
    <div style={{ position: 'absolute', inset: 0, backgroundImage: theme.grid, backgroundSize: '40px 40px', opacity: 0.1 }} />
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: 'absolute', top: '10%', right: '10%', width: '400px', height: '400px', background: `${theme.prim}11`, borderRadius: '50%', filter: 'blur(100px)' }} />
    <div style={{ position: 'relative', zIndex: 10, maxWidth: '900px' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'inline-block', padding: '6px 16px', borderRadius: '30px', border: `1px solid ${theme.prim}44`, backgroundColor: `${theme.prim}11`, color: theme.prim, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '3px', marginBottom: '40px' }}>Imobiliária · Crédito · Clínicas</motion.div>
      <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 'clamp(44px, 10vw, 100px)', lineHeight: 0.85, letterSpacing: '-6px', marginBottom: '40px' }}>O teu negócio está <br /><span style={{ color: theme.prim, fontStyle: 'italic' }}>a perder dinheiro</span> <br />todos os dias.</h1>
      <p style={{ color: theme.text2, fontSize: '20px', maxWidth: '650px', margin: '0 auto 64px', lineHeight: 1.6, fontWeight: 300 }}>Não por falta de leads. Por falta de sistema. Instalamos o motor comercial completo 24/7. Automático. Previsível. Inevitável.</p>
      <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }}>
        <button style={{ backgroundColor: theme.prim, color: theme.bg, border: 'none', padding: '20px 64px', borderRadius: '16px', fontFamily: 'Syne', fontWeight: 800, fontSize: '16px', textTransform: 'uppercase', letterSpacing: '2px', cursor: 'pointer', boxShadow: `0 10px 40px ${theme.prim}44` }}>Quero Ativar Sistema →</button>
        <div style={{ color: theme.text3, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px' }}>Agendamento de Diagnóstico de 45 min</div>
      </div>
    </div>
  </section>
);

const Problem = () => (
  <section style={{ padding: '120px 24px', backgroundColor: '#080F18' }}>
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '80px' }}>
      <div style={{ maxWidth: '600px' }}>
        <div style={{ color: theme.prim, fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '4px', marginBottom: '16px' }}>O Problema Estrutural</div>
        <h2 style={{ fontFamily: 'Syne', fontSize: '56px', fontWeight: 800, lineHeight: 1, marginBottom: '32px' }}>Muitos leads, <span style={{ color: theme.prim, fontStyle: 'italic' }}>zero retorno.</span></h2>
        <p style={{ color: theme.text2, fontSize: '18px', lineHeight: 1.6 }}>O teu comercial não é disciplinado. O teu CRM é um cemitério de contactos. Tu estás a pagar por publicidade para ver leads a apodrecer.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px' }}>
        {['Leads Ignoradas', 'Inconsistência', 'Desperdício ROI', 'Dependência Humante'].map((t, i) => (
          <motion.div key={i} variants={fup} initial="initial" whileInView="whileInView" style={{ backgroundColor: theme.surf, padding: '48px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <TrendingDown color={theme.p} size={32} style={{ marginBottom: '24px' }} />
            <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>{t}</h3>
            <p style={{ color: theme.text2, fontSize: '14px', lineHeight: 1.6 }}>Centenas de contactos que mostraram interesse — e nunca mais foram trabalhados com a agressividade necessária.</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

const MethodHYPE = () => {
  const steps = [
    { l: 'H', t: 'Humaniza', c: theme.h, d: 'Posicionamento documental autoral. Estratégia de conteúdo que vende a tua autoridade antes do comercial abrir a boca.' },
    { l: 'Y', t: 'Yield', c: theme.y, d: 'Geração ativa + Reactivação automática da base morta. Extraímos o lucro que ficou em cima da mesa nos últimos 12 meses.' },
    { l: 'P', t: 'Pipeline', c: theme.p, d: 'Triagem por IA e agendamento automático. O teu comercial só atende quem está pronto para pagar. 100% Qualificado.' },
    { l: 'E', t: 'Escala', c: theme.e, d: 'Infraestrutura comercial independente. A empresa cresce porque tem processo, não porque alguém trabalha mais horas.' }
  ];
  return (
    <section id="metodo" style={{ padding: '160px 24px', position: 'relative' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '100px' }}>
          <h2 style={{ fontFamily: 'Syne', fontSize: '96px', fontWeight: 800, letterSpacing: '-6px' }}>Método <span style={{ fontStyle: 'italic' }}>HYPE</span></h2>
          <p style={{ color: theme.text2, fontSize: '18px', marginTop: '24px' }}>A engenharia comercial inevitável para o teu negócio.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
          {steps.map((s, i) => (
            <motion.div key={i} variants={fup} initial="initial" whileInView="whileInView" style={{ backgroundColor: theme.surf, borderRadius: '32px', padding: '64px 48px', position: 'relative', overflow: 'hidden', borderLeft: `6px solid ${s.c}` }}>
              <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '120px', fontWeight: 900, color: s.c, opacity: 0.08, fontFamily: 'Syne' }}>{s.l}</div>
              <div style={{ color: s.c, fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '4px', marginBottom: '24px' }}>Fase 0{i+1}</div>
              <h3 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '24px' }}>{s.t}</h3>
              <p style={{ color: theme.text2, fontSize: '15px', lineHeight: 1.7 }}>{s.d}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Market = () => (
  <section id="nicho" style={{ padding: '120px 24px', backgroundColor: '#080F18' }}>
    <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
      <h2 style={{ fontFamily: 'Syne', fontSize: '56px', fontWeight: 800, marginBottom: '80px' }}>O motor para o teu <span style={{ color: theme.prim, fontStyle: 'italic' }}>nicho.</span></h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
        {[
          { t: 'Imobiliária', i: Layout, d: 'Reactivamos compradores antigos e automatizamos a triagem de proprietários.' },
          { t: 'Crédito', i: Repeat, d: 'Cada segundo conta. O nosso sistema liga a lead ao agendamento em instantes.' },
          { t: 'Clínicas', i: Users, d: 'Reativação de pacientes e qualificação de novos agendamentos premium.' }
        ].map((n, i) => (
          <motion.div key={i} variants={fup} initial="initial" whileInView="whileInView" style={{ padding: '48px', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', backgroundColor: theme.bg }}>
            <n.i color={theme.prim} size={48} style={{ marginBottom: '32px' }} />
            <h3 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '20px' }}>{n.t}</h3>
            <p style={{ color: theme.text2, fontSize: '15px', lineHeight: 1.6 }}>{n.d}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

const PortalPreview = () => (
  <section id="portal" style={{ padding: '140px 24px' }}>
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', lgDirection: 'row', gap: '80px', alignItems: 'center' }}>
      <div style={{ lgWidth: '50%' }}>
        <div style={{ backgroundColor: `${theme.success}11`, color: theme.success, padding: '4px 12px', borderRadius: '20px', fontSize: '10px', fontWeight: 800, display: 'inline-block', marginBottom: '24px', letterSpacing: '2px' }}>DASHBOARD EM TEMPO REAL</div>
        <h2 style={{ fontFamily: 'Syne', fontSize: '64px', fontWeight: 800, lineHeight: 0.9, marginBottom: '32px' }}>Não confies em palavras. <br /><span style={{ color: theme.prim, fontStyle: 'italic' }}>Olha para os números.</span></h2>
        <p style={{ color: theme.text2, fontSize: '18px', lineHeight: 1.6, marginBottom: '40px' }}>O nosso portal dá-te transparência total. Monitoriza leads, agendamentos e ROI sem precisares de pedir relatórios.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {['Leads Activas', 'Agendamentos', 'Conversão IA', 'Lucro Gerado'].map(f => <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, fontSize: '13px' }}><CheckCircle color={theme.success} size={16} /> {f}</div>)}
        </div>
      </div>
      <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} style={{ lgWidth: '50%', backgroundColor: theme.surf, borderRadius: '24px', padding: '32px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: `0 40px 80px rgba(0,0,0,0.5)` }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: theme.success }} /> <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px' }}>Consola Master</span></div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: theme.prim }}>€12.450 <span style={{ fontSize: '10px', opacity: 0.5 }}>ROI Est.</span></div>
         </div>
         <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ backgroundColor: theme.bg, padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}><div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: `${theme.prim}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, color: theme.prim }}>L</div><div><div style={{ fontSize: '13px', fontWeight: 800 }}>Lead Qualificada #{i}</div><div style={{ fontSize: '11px', color: theme.text3 }}>Pipeline: Fase 3 (Triagem)</div></div></div>
                <div style={{ color: theme.success, fontSize: '11px', fontWeight: 800 }}>98% Match</div>
              </div>
            ))}
         </div>
      </motion.div>
    </div>
  </section>
);

const Comparison = () => (
    <section style={{ padding: '120px 24px', backgroundColor: '#080F18' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <h2 style={{ fontFamily: 'Syne', fontSize: '56px', fontWeight: 800, textAlign: 'center', marginBottom: '80px' }}>Porquê o <span style={{ color: theme.prim, fontStyle: 'italic' }}>Fluxo?</span></h2>
            <div style={{ display: 'grid', mdGridTemplateColumns: '1fr 1fr', gap: '1px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '24px', overflow: 'hidden' }}>
                <div style={{ padding: '64px', backgroundColor: theme.surf }}>
                    <h3 style={{ fontSize: '24px', marginBottom: '32px', opacity: 0.5 }}>Agência Tradicional</h3>
                    {['Gestão de Posts', 'Tráfego sem CRM', 'Relatórios PDF', 'Dependência de Terceiros'].map(t => <div key={t} style={{ display: 'flex', gap: '16px', marginBottom: '20px', color: theme.text2 }}><X color={theme.p} size={20} /> {t}</div>)}
                </div>
                <div style={{ padding: '64px', backgroundColor: theme.surf, position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', backgroundColor: theme.prim }} />
                    <h3 style={{ fontSize: '24px', marginBottom: '32px', color: theme.prim }}>HYPE Flow</h3>
                    {['Infraestrutura Própria', 'Triagem Automática', 'Diagnóstico Real-time', 'Independência Total'].map(t => <div key={t} style={{ display: 'flex', gap: '16px', marginBottom: '20px', fontWeight: 700 }}><CheckCircle color={theme.success} size={20} /> {t}</div>)}
                </div>
            </div>
        </div>
    </section>
);

const FAQ = () => {
  const [open, setOpen] = useState(null);
  const items = [
    { q: "Preciso de ter muitos leads?", a: "Não. O nosso sistema performa tanto para bases de 500 como de 50.000 contactos. O que importa é a inteligência da reactivação." },
    { q: "A minha equipa não é técnica, conseguem usar?", a: "O sistema é 'Done-for-you'. Nós instalamos e configuramos tudo. A tua equipa só precisa de atender quem quer comprar." },
    { q: "Quanto tempo até ver resultados?", a: "O setup demora 48h. Temos casos de clientes que recuperaram o investimento na primeira semana através da reactivação automática." },
    { q: "Substituem o meu marketing atual?", a: "Não. Nós somos o motor que faz o teu marketing actual funcionar 10x melhor. Somos engenharia comercial, não agência criativa." },
    { q: "E se eu não tiver CRM?", a: "Nós instalamos e estruturamos a infraestrutura completa, incluindo o fluxo de CRM inteligente." }
  ];
  return (
    <section style={{ padding: '120px 24px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'Syne', fontSize: '48px', fontWeight: 800, marginBottom: '64px' }}>Dúvidas de quem <br /><span style={{ color: theme.prim, fontStyle: 'italic' }}>quer escalar.</span></h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {items.map((item, i) => (
            <div key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '24px' }}>
              <button 
                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', color: '#fff', fontSize: '18px', fontWeight: 800, cursor: 'pointer', textAlign: 'left' }}
                onClick={() => setOpen(open === i ? null : i)}
              >
                {item.q}
                <motion.div animate={{ rotate: open === i ? 45 : 0 }} transition={{ duration: 0.3 }}><Plus color={theme.prim} /></motion.div>
              </button>
              <AnimatePresence>
                {open === i && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', padding: '16px 0', color: theme.text2, fontSize: '15px', lineHeight: 1.6 }}>
                    {item.a}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const CTAFinal = () => (
  <section style={{ padding: '160px 24px', position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '800px', height: '800px', background: `${theme.prim}08`, borderRadius: '50%', filter: 'blur(120px)' }} />
    <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 10, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '100px' }}>
      <h2 style={{ fontFamily: 'Syne', fontSize: 'clamp(40px, 8vw, 84px)', fontWeight: 800, lineHeight: 0.9, letterSpacing: '-4px', marginBottom: '40px' }}>Pronto para colocar o teu negócio em <span style={{ color: theme.prim, fontStyle: 'italic' }}>fluxo constante?</span></h2>
      <p style={{ color: theme.text2, fontSize: '20px', marginBottom: '64px' }}>Agenda agora o teu Diagnóstico Gratuito de 45 minutos. Sái com clareza total sobre o teu potencial comercial.</p>
      <button style={{ backgroundColor: theme.prim, color: theme.bg, border: 'none', padding: '24px 80px', borderRadius: '20px', fontFamily: 'Syne', fontWeight: 800, fontSize: '20px', textTransform: 'uppercase', letterSpacing: '2px', cursor: 'pointer', boxShadow: `0 20px 60px ${theme.prim}55` }}>Agenda agora →</button>
      <div style={{ marginTop: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontSize: '13px', fontWeight: 700, color: theme.success, textTransform: 'uppercase', letterSpacing: '2px' }}><ShieldCheck size={20} /> Sem pitch agressivo. Só diagnóstico real.</div>
    </div>
  </section>
);

const Footer = () => (
  <footer style={{ padding: '120px 24px', backgroundColor: '#030A10', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', mdDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: '64px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontFamily: 'Syne', fontWeight: 800, fontSize: '32px', color: theme.prim, marginBottom: '16px' }}>
          <Fingerprint size={48} /> HYPE FLOW
        </div>
        <p style={{ color: theme.text3, fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '4px' }}>O Teu Negócio em Fluxo Constante.</p>
      </div>
      <div style={{ textAlign: 'center', mdTextAlign: 'right' }}>
        <p style={{ color: theme.text2, fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>hello@hypeflow.pt · @souguilhermepro</p>
        <p style={{ color: theme.text3, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '2px' }}>© 2026 HYPE Flow · Engenharia de Performance B2B</p>
      </div>
    </div>
  </footer>
);

const App = () => {
  useEffect(() => {
    const l = new Lenis();
    const r = (t) => { l.raf(t); requestAnimationFrame(r); };
    requestAnimationFrame(r);
  }, []);

  return (
    <div style={{ backgroundColor: theme.bg, color: theme.text1, minHeight: '100vh', fontFamily: 'DM Sans, sans-serif' }}>
      <Navbar />
      <Hero />
      <Problem />
      <MethodHYPE />
      <Market />
      <PortalPreview />
      <Comparison />
      <FAQ />
      <CTAFinal />
      <Footer />
    </div>
  );
};

export default App;
