import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../logger/index.js';
import { env } from './env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

class DynamicConfig {
  constructor() {
    this.settings = {
      targetGroups: env.TARGET_GROUPS || []
    };
    this.ensureDataDir();
    this.load();
  }

  ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  load() {
    try {
      if (fs.existsSync(SETTINGS_FILE)) {
        const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
        this.settings = JSON.parse(data);
        logger.info('Configurações dinâmicas carregadas.', { targetGroups: this.settings.targetGroups });
      } else {
        // Se não existir o arquivo, cria um usando os valores iniciais (vindos do .env)
        this.save();
      }
    } catch (error) {
      logger.error('Erro ao carregar configurações dinâmicas.', { error: error.message });
    }
  }

  save() {
    try {
      this.ensureDataDir();
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(this.settings, null, 2));
      logger.info('Configurações dinâmicas salvas.', { targetGroups: this.settings.targetGroups });
    } catch (error) {
      logger.error('Erro ao salvar configurações dinâmicas.', { error: error.message });
    }
  }

  getTargetGroups() {
    return this.settings.targetGroups || [];
  }

  addTargetGroup(groupName) {
    const group = groupName.trim();
    if (!group) return false;
    
    // Evita duplicatas (case insensitive)
    const exists = this.settings.targetGroups.some(g => g.toLowerCase() === group.toLowerCase());
    if (exists) return false;

    this.settings.targetGroups.push(group);
    this.save();
    return true;
  }

  removeTargetGroup(groupName) {
    const initialLength = this.settings.targetGroups.length;
    this.settings.targetGroups = this.settings.targetGroups.filter(
      g => g.toLowerCase() !== groupName.toLowerCase()
    );
    
    if (this.settings.targetGroups.length !== initialLength) {
      this.save();
      return true;
    }
    return false;
  }
}

export default new DynamicConfig();
