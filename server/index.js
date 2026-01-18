import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const log = console.log;

app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Servir os arquivos estáticos do frontend (pasta dist)
app.use(express.static(path.join(__dirname, '../dist')));

log('Configurado diretório estático: ' + path.join(__dirname, '../dist'));

const PORT = process.env.PORT || 3001;

app.post('/api/consult', async (req, res) => {
  const { plate } = req.body;

  if (!plate || plate.length !== 7) {
    return res.status(400).json({ error: 'Placa inválida' });
  }

  console.log(`[QUERY] Iniciando consulta para placa: ${plate}`);

  let browser = null;

  try {
    // Modo Nuvem: Lançar o navegador em vez de conectar
    console.log('[LAUNCH] Iniciando navegador...');
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();

    // Autenticação Básica (utilizando variáveis de ambiente para segurança)
    const USER = process.env.DETRAN_USER;
    const PASS = process.env.DETRAN_PASS;

    if (!USER || !PASS) {
      throw new Error("Credenciais do Detran (DETRAN_USER/DETRAN_PASS) não configuradas no servidor.");
    }

    await page.authenticate({ username: USER, password: PASS });

    console.log('[GOTO] Acessando DetranNet...');
    await page.goto('https://sistema.detrannet.sc.gov.br/arearestrita/tela_principal.asp', {
      waitUntil: 'networkidle2'
    });

    console.log(`[STEP] Usando aba: ${page.url()}`);

    // 3. Encontrar o Frame correto
    // O site usa <frameset>, então o input está dentro de um child frame
    const inputSelector = 'input[name="placa"]';

    let frame = null;

    // Esperar um pouco para garantir que frames carregaram (caso refresh)
    // await new Promise(r => setTimeout(r, 1000));

    for (const f of page.frames()) {
      try {
        const found = await f.$(inputSelector);
        if (found) {
          frame = f;
          console.log(`[STEP] Input encontrado no frame: ${f.name() || f.url()}`);
          break;
        }
      } catch (e) {
        // Ignorar frames inacessíveis (cross-origin se houver)
      }
    }

    if (!frame) {
      return res.status(400).json({ error: 'Campo de placa não encontrado em nenhum frame da página.' });
    }

    // 4. Interação no Frame

    console.log('[STEP] Inserindo placa no frame...');

    // Limpar e Digitar
    await frame.evaluate((sel, placa) => {
      const el = document.querySelector(sel);
      el.value = ''; // Limpar safe
      el.value = placa; // Setar valor
      // Trigger de eventos para garantir que o JS da página pegue
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    }, inputSelector, plate);

    console.log('[STEP] Tentando enviar...');

    // Tenta achar o botão de seta ou dar Enter
    // O usuário mencionou "clicar na seta após a placa".
    const clicked = await frame.evaluate(() => {
      const input = document.querySelector('input[name="placa"]');
      if (!input) return false;

      let next = input.nextElementSibling;
      while (next) {
        // Procura inputs image ou imagens clicaveis
        if ((next.tagName === 'INPUT' && next.type === 'image') ||
          (next.tagName === 'IMG' && (next.onclick || next.closest('a')))) {
          next.click();
          return true;
        }
        next = next.nextElementSibling;
      }
      return false;
    });

    if (!clicked) {
      console.log('[INFO] Seta não encontrada via DOM, enviando ENTER no campo...');
      await frame.focus(inputSelector);
      await page.keyboard.press('Enter');
    }

    // Esperar carregamento
    await new Promise(r => setTimeout(r, 2000));

    // 5. Extração de Dados (Do Frame, pois a resposta carrega nele)
    console.log('[STEP] Raspando dados do frame...');

    // Pode ser que a resposta carregue em OUTRO frame ou no mesmo.
    // Geralmente em sistemas ASP antigos, recarrega o mesmo frame ou um frame de conteúdo.
    // Vamos procurar os dados em TODOS os frames se não achar no atual.

    let dataFrame = frame;
    // Pequena função para checar se tem dados
    const checkData = async (f) => {
      return f.evaluate(() => document.body.innerText.includes('Dados do Veic') || document.body.innerText.includes('Placa'));
    };

    // Se o frame original não tiver dados novos, procura em outros (ex: frame 'form' ou 'Consulta')
    if (!await checkData(frame)) {
      console.log('[INFO] Dados não parecem estar no frame de input, procurando em outros...');
      for (const f of page.frames()) {
        if (await checkData(f)) {
          dataFrame = f;
          console.log(`[STEP] Dados encontrados no frame: ${f.name()}`);
          break;
        }
      }
    }

    const data = await dataFrame.evaluate(async () => { // Changed to async
      const result = {
        foundInDetranSC: false,
        plate: '', model: '', color: '', municipality: '',
        licensingYear: 0, restrictions: '', hasRestrictions: false,
        totalDebts: 0, debtDetails: [], rawText: ''
      };

      const text = document.body.innerText;
      result.rawText = text;

      if (text.includes('Dados do Veicu') || text.includes('Marca/Modelo')) {
        result.foundInDetranSC = true;

        // Regex melhorado para limpar "sujeira" da próxima coluna (tabs ou labels vizinhos)
        // Helper regex que pega até a quebra de linha ou tab
        const extract = (regex) => {
          const match = document.body.innerText.match(regex);
          if (match && match[1]) {
            // Limpa tabs e quebras de linha e remove labels comuns que podem ter vindo junto
            let val = match[1].split('\t')[0].split('\n')[0].trim();
            // Remove sufixos indesejados caso o regex pegue demais
            val = val.replace(/Fabricação.*/i, '')
              .replace(/Carroceria.*/i, '')
              .replace(/Licenciado.*/i, '')
              .replace(/Categoria.*/i, '')
              .trim();
            return val;
          }
          return null;
        }

        // Placa
        // Ex: Placa\nPAS3I64 Renavam...
        result.plate = extract(/Placa\s*[\r\n]+\s*([A-Z0-9]{7})/i);

        // Modelo
        // Ex: Marca/Modelo\n108661 - I/CHEV... -> Remover o código inicial
        let rawModel = extract(/Marca\/Modelo\s*[\r\n]+\s*(.*)/i);
        if (rawModel) {
          // Remove numeros e hifens do inicio (ex: "108661 - ")
          result.model = rawModel.replace(/^\d+\s*-\s*/, '').trim();
        }

        // Cor
        // Ex: Cor\n4-BRANCA -> Remover o numero inicial
        let rawColor = extract(/Cor\s*[\r\n]+\s*(.*)/i);
        if (rawColor) {
          // Remove digitos e hifen (ex: "4-")
          result.color = rawColor.replace(/^\d+\s*-?/, '').trim();
        }

        // Município
        // Ex: Município de Emplacamento\nSAO JOSE \tLicenciado
        result.municipality = extract(/Município de Emplacamento\s*[\r\n]+\s*(.*)/i);

        // Ano/Licenciamento
        const licText = document.body.innerText;
        const licMatch = licText.match(/Licenciado\s*[\r\n]+\s*(\d{4})/i);
        if (licMatch) {
          result.licensingYear = parseInt(licMatch[1]);
        } else {
          // Tenta achar o ano solto se falhar
          const anoFab = licText.match(/Fabricação\/Modelo\s*[\r\n]+\s*(\d{4})/i);
          if (anoFab) result.licensingYear = parseInt(anoFab[1]);
        }

        // Restrição
        // Ex: Restrições\nNenhuma restrição registrada até esta data
        // O usuário disse que vem de um campo específico.
        // Pelo print 1, parece ser o texto logo abaixo do título "Restrições"
        const rest = extract(/Restrições\s*[\r\n]+\s*(.*)/i);
        result.restrictions = rest || 'Nenhuma';

        // Normalização de Restrições
        const restLower = result.restrictions.toLowerCase();
        if (restLower.includes('nenhuma') || restLower.includes('nada consta')) {
          result.restrictions = 'Sem Restrições';
          result.hasRestrictions = false;
        } else {
          result.hasRestrictions = true;
        }

        // --- LÓGICA DE DÉBITOS ---
        result.debtDetails = [];
        result.debugLogs = []; // Array para capturar logs do navegador

        const log = (msg) => result.debugLogs.push(msg);

        // Debug: Procurar Header
        const debitHeader = Array.from(document.querySelectorAll('span, td, div, a, font, b')).find(el =>
          el.innerText && el.innerText.includes('Listagem de Débitos')
        );

        if (debitHeader) {
          log('Header encontrado, clicando...');
          debitHeader.click();
          // Espera assincrona que permite o event loop rodar (essencial para o callback do iframe funcionar)
          await new Promise(r => setTimeout(r, 4000));
        } else {
          log('Header Listagem de Débitos NAO ENCONTRADO');
        }

        // 2. Buscar o total diretamente - ESTRATÉGIA FINAL
        // O usuario mandou print onde aparece "Total dos Débitos" e na mesma linha o valor.
        // Vamos procurar qualquer elemento que contenha esse texto e vasculhar a linha (TR) inteira.

        let foundTotal = false;

        // Procura em todos os elementos de texto relevantes
        const candidateElements = Array.from(document.querySelectorAll('td, span, div, b, font'));

        for (const el of candidateElements) {
          // Normaliza texto para busca (remove espaços extras)
          const text = el.innerText ? el.innerText.replace(/\s+/g, ' ').trim() : '';

          if (text.includes('Total dos Débitos')) {
            log('DEBUG: Achei label "Total dos Débitos" em tag: ' + el.tagName);

            // Sobe até o TR pai
            const parentRow = el.closest('tr');

            if (parentRow) {
              log('DEBUG: Analisando linha do total...');
              const rowText = parentRow.innerText;
              log('DEBUG: Texto da linha: ' + rowText.replace(/\n/g, ' '));

              // Estrategia A: Tenta achar células (td) na linha que contenham R$
              const cells = Array.from(parentRow.querySelectorAll('td'));

              // Varre de trás para frente (geralmente o total é a última col)
              for (let k = cells.length - 1; k >= 0; k--) {
                const cellText = cells[k].innerText.trim();
                // Ignora se for a própria célula do label (a não ser que tenha o valor junto)
                // Mas se tiver "Total dos Débitos R$ 1000", ok.

                if (cellText.includes('R$') || (cellText.match(/[\d\.]+,[\d]{2}/))) {
                  // É um candidato a valor
                  let valorStr = cellText;

                  // Se o texto for misturado "Total dos Débitos R$ 1.377,19", limpamos o label
                  if (valorStr.includes('Total dos Débitos')) {
                    valorStr = valorStr.replace('Total dos Débitos', '').trim();
                  }

                  const valorClean = valorStr.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
                  // Remove caracteres não numericos exceto ponto (ex: asteriscos)
                  const valorCleanNum = valorClean.replace(/[^\d\.]/g, '');

                  const val = parseFloat(valorCleanNum);

                  if (!isNaN(val)) {
                    result.totalDebts = val;
                    foundTotal = true;
                    log('SUCESSO: Valor extraído via célula irmã/mesma: ' + val);
                    break;
                  }
                }
              }
            }
          }
          if (foundTotal) break;
        }

        if (!foundTotal) {
          result.totalDebts = 0;
          log('FALHA: Não encontrei valor associado a "Total dos Débitos".');
        }

        // --- 3. Extrair DETALHES dos débitos (Filtrando vencidos) ---
        // Agora que temos o total oficial, vamos varrer a tabela para pegar os itens
        // Só adicionamos se estiver vencido (data < hoje)

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Tenta achar a tabela de novo baseada em headers ou id
        // O ID visto no código fonte do user é "tblDebitosVeiculo"
        const debtTable = document.getElementById('tblDebitosVeiculo') ||
          Array.from(document.querySelectorAll('table')).find(t => t.innerText.includes('Vencimento') && t.innerText.includes('Valor Nominal'));

        if (debtTable) {
          const rows = Array.from(debtTable.querySelectorAll('tr'));
          for (const row of rows) {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 6) {
              // Tenta achar a coluna de vencimento (geralmente index 2, mas vamos validar formato)
              // Ex: 30/06/2026
              let vencimentoText = '';
              let valorText = '';
              let descText = '';

              // Descrição geralmente na primeira coluna visivel
              descText = cells[0].innerText.trim();

              // Procura data dd/mm/yyyy
              for (const c of cells) {
                const txt = c.innerText.trim();
                if (/^\d{2}\/\d{2}\/\d{4}$/.test(txt)) {
                  vencimentoText = txt;
                  break;
                }
              }

              // Procura valor (R$ ou numero com virgula) nas ultimas colunas
              // Valor Atual é a ultima
              for (let k = cells.length - 1; k >= 0; k--) {
                const txt = cells[k].innerText.trim();
                if (txt.includes(',') && (txt.includes('.') || txt.includes('R$') || /^\d+,\d{2}$/.test(txt))) {
                  valorText = txt;
                  break;
                }
              }

              if (vencimentoText && valorText) {
                const [dia, mes, ano] = vencimentoText.split('/').map(Number);
                const vencimentoDate = new Date(ano, mes - 1, dia);

                const valClean = valorText.replace('R$', '').replace(/\./g, '').replace(',', '.').replace(/[^\d\.]/g, '');
                const valor = parseFloat(valClean);

                if (!isNaN(valor)) {
                  // FILTRO: Só vencidos
                  if (vencimentoDate < today) {
                    result.debtDetails.push({
                      description: descText, // Nome do débito
                      type: 'Débito Vencido',
                      dueDate: vencimentoText,
                      value: valor
                    });
                  }
                }
              }
            }
          }
        }
      } else if (text.includes('Nenhum veículo encontrado') || text.includes('não confere')) {
        result.foundInDetranSC = false;
      }

      return result;
    });

    const responseData = {
      plate: data.plate || plate.toUpperCase(),
      model: data.model || 'Consultado no Detran',
      color: data.color || '-',
      municipality: data.municipality || 'SC',
      licensingYear: data.licensingYear || new Date().getFullYear(),
      restrictions: data.restrictions || (data.foundInDetranSC ? 'Sem Restrições' : 'Não encontrado'),
      hasRestrictions: data.hasRestrictions,
      totalDebts: 0,
      totalDebts: data.totalDebts, // Use totalDebts from data
      lastUpdate: new Date().toLocaleString('pt-BR'),
      foundInDetranSC: data.foundInDetranSC,
      debtDetails: data.debtDetails // Use debtDetails from data
    };

    console.log('[RESULT]', responseData);
    if (data.debugLogs && data.debugLogs.length > 0) {
      console.log('[BROWSER LOGS]:', data.debugLogs);
    }
    res.json(responseData);

  } catch (error) {
    console.error('Erro geral:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (browser) await browser.close(); // Em modo launch, usamos close()
  }
});

// Rota catch-all para servir o index.html em qualquer rota que não seja /api
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Sistema unificado rodando!`);
  console.log(`Acesse no computador: http://localhost:${PORT}`);
  console.log(`Instruções de acesso remoto enviadas ao terminal.`);
});
