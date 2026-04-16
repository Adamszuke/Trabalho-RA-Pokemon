import * as THREE from 'three';
import { MindARThree } from 'mindar-image-three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let pokemons = [null, null];
let player, enemy;
let isPlayerTurn = true;
let battleBtn;

document.addEventListener("DOMContentLoaded", () => {
  battleBtn = document.getElementById("battleBtn");
  battleBtn.addEventListener("click", () => {
    if (pokemons[0] && pokemons[1]) {
      startBattle(pokemons[0], pokemons[1]);
    }
  });
  start();
});

// --- Início da Função start() ---
const start = async () => {
  console.log("Iniciando sistema AR...");

  const mindarThree = new MindARThree({
    container: document.body,
    imageTargetSrc: "targets.mind",
    maxTrack: 2, // Permite detectar os dois alvos ao mesmo tempo
    rendererConfig: {
      alpha: true,
      antialias: true
    }
  });

  const { renderer, scene, camera } = mindarThree;

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  // Luzes
  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  scene.add(light);
  const directLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directLight.position.set(0, 1, 1);
  scene.add(directLight);

  const loader = new GLTFLoader();

  // --- PIKACHU (Target 0) ---
  const anchor1 = mindarThree.addAnchor(0);
  // CORREÇÃO: Carrega o pikachu.glb aqui
  loader.load("assets/infernape.glb", (gltf) => {
    const model = gltf.scene;
    // Escala pequena para o Pikachu
    model.scale.set(0.18, 0.18, 0.18); 
    anchor1.group.add(model);

    anchor1.onTargetFound = () => {
      console.log("Pikachu detectado!");
      pokemons[0] = {
        name: "Pikachu", hp: 100, maxHp: 100,
        moves: [
          { name: "Choque do Trovão", damage: 15 },
          { name: "Investida", damage: 10 },
        ],
      };
      checkBattleReady();
    };

    anchor1.onTargetLost = () => {
      // Só limpa se a batalha ainda NÃO começou
      if (document.getElementById("battleUI").style.display !== "block") {
        pokemons[0] = null;
        checkBattleReady();
      }
    };
  });

  // --- INFERNAPE (Target 1) ---
  const anchor2 = mindarThree.addAnchor(1);
  // CORREÇÃO: Carrega o infernape.glb aqui
  loader.load("assets/pikachu.glb", (gltf) => {
    const model = gltf.scene;
    // Escala normal/maior para o Infernape
    model.scale.set(0.02, 0.02, 0.02);  
    anchor2.group.add(model);

    anchor2.onTargetFound = () => {
      console.log("Infernape detectado!");
      pokemons[1] = {
        name: "Infernape", hp: 100, maxHp: 100,
        moves: [
          { name: "Brasas", damage: 14 },
          { name: "Arranhão", damage: 9 },
        ],
      };
      checkBattleReady();
    };

    anchor2.onTargetLost = () => {
      if (document.getElementById("battleUI").style.display !== "block") {
        pokemons[1] = null;
        checkBattleReady();
      }
    };
  });

  try {
    await mindarThree.start();
    renderer.setAnimationLoop(() => {
      renderer.render(scene, camera);
    });
  } catch (e) {
    console.error("Erro ao iniciar câmera AR:", e);
  }
};
// --- Fim da Função start() ---

function checkBattleReady() {
  // Mostra o botão apenas se os dois estiverem em campo
  if (pokemons[0] && pokemons[1]) {
    battleBtn.style.display = "block";
  } else {
    battleBtn.style.display = "none";
  }
}

// ================= LÓGICA DE BATALHA =================

function startBattle(p1, p2) {
  player = p1; 
  enemy = p2; 
  isPlayerTurn = true;
  
  document.getElementById("battleUI").style.display = "block";
  battleBtn.style.display = "none";
  
  updateUI(); 
  showMoves();
}

function updateUI() {
  document.getElementById("status").innerHTML = `
    <strong>${player.name}</strong> HP: ${Math.max(player.hp, 0)}/${player.maxHp}<br>
    <strong>${enemy.name}</strong> HP: ${Math.max(enemy.hp, 0)}/${enemy.maxHp}
  `;
}

function showMoves() {
  const movesDiv = document.getElementById("moves");
  movesDiv.innerHTML = "";
  player.moves.forEach((move, index) => {
    const btn = document.createElement("button");
    btn.innerText = move.name;
    btn.onclick = () => playerAttack(index);
    movesDiv.appendChild(btn);
  });
}

// Nova função para atualizar o texto na tela
function updateLog(message) {
  const logDiv = document.getElementById("battleLog");
  logDiv.innerText = message;
  
  // Log visual no console também
  console.log("%c" + message, "color: #ffcb05; font-weight: bold;");
}

function playerAttack(index) {
  if (!isPlayerTurn) return;

  const move = player.moves[index];
  enemy.hp -= move.damage;
  
  // Atualiza a mensagem na tela
  updateLog(`${player.name} usou ${move.name}! Causou ${move.damage} de dano.`);
  
  updateUI();
  if (checkWin()) return;

  isPlayerTurn = false;
  // Desabilita botões para o jogador não clicar mil vezes
  document.querySelectorAll("#moves button").forEach(b => b.disabled = true);

  // Espera 1.5 segundos para o inimigo atacar
  setTimeout(enemyTurn, 1500);
}

function enemyTurn() {
  const move = enemy.moves[Math.floor(Math.random() * enemy.moves.length)];
  player.hp -= move.damage;
  
  // Atualiza a mensagem na tela
  updateLog(`${enemy.name} revidou com ${move.name}! Causou ${move.damage} de dano.`);
  
  updateUI();
  if (checkWin()) return;

  isPlayerTurn = true;
  // Reabilita os botões
  document.querySelectorAll("#moves button").forEach(b => b.disabled = false);
}

function checkWin() {
  if (player.hp <= 0 || enemy.hp <= 0) {
    const winner = player.hp <= 0 ? enemy.name : player.name;
    const msg = player.hp <= 0 ? "Você Perdeu!" : "Você Venceu!";
    
    updateLog(`${winner} venceu a batalha!`); // Mensagem final no log
    
    document.getElementById("status").innerHTML = `<h1>${msg}</h1>`;
    document.getElementById("moves").innerHTML = `<button onclick="location.reload()">Jogar Novamente</button>`;
    return true;
  }
  return false;
}