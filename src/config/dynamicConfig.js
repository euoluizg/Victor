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
      targetGroups: env.TARGET_GROUPS || [],
      delayMin: env.VOTE_DELAY_MIN || 0,
      delayMax: env.VOTE_DELAY_MAX || 500,
      voteOption: 1
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

  getDelayConfig() {
    return {
      delayMin: this.settings.delayMin !== undefined ? this.settings.delayMin : env.VOTE_DELAY_MIN || 0,
      delayMax: this.settings.delayMax !== undefined ? this.settings.delayMax : env.VOTE_DELAY_MAX || 500,
      voteOption: this.settings.voteOption !== undefined ? this.settings.voteOption : 1
    };
  }

  updateDelayConfig(min, max, voteOption) {
    const minVal = parseInt(min, 10);
    const maxVal = parseInt(max, 10);
    const optionVal = parseInt(voteOption, 10);
    
    if (isNaN(minVal) || isNaN(maxVal) || minVal < 0 || maxVal < minVal || isNaN(optionVal) || optionVal < 1) {
      return false;
    }

    this.settings.delayMin = minVal;
    this.settings.delayMax = maxVal;
    this.settings.voteOption = optionVal;
    this.save();
    return true;
  }
}

export default new DynamicConfig();
