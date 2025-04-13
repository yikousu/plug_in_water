document.addEventListener("DOMContentLoaded", () => {
  const intervalInput = document.getElementById("interval");
  const saveButton = document.getElementById("save");
  const statusDisplay = document.getElementById("status");

  // 加载时获取当前设置和状态
  chrome.storage.sync.get("interval", ({ interval }) => {
    if (interval) {
      intervalInput.value = interval;
    }
  });

  // 向 background.js 请求当前状态
  chrome.runtime.sendMessage({ command: "getStatus" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("获取状态时出错:", chrome.runtime.lastError.message);
      statusDisplay.textContent = "状态：错误";
    } else if (response) {
      if (response.status === "运行中") {
        statusDisplay.textContent = `状态：运行中，每 ${response.interval} 分钟提醒一次。`;
        saveButton.textContent = "更新设置"; // 或 '停止提醒'
      } else {
        statusDisplay.textContent = "状态：已停止";
        saveButton.textContent = "启动提醒";
      }
    } else {
      statusDisplay.textContent = "状态：未知";
    }
  });

  // 保存按钮点击事件
  saveButton.addEventListener("click", () => {
    const interval = parseInt(intervalInput.value, 10);
    if (isNaN(interval) || interval < 1) {
      alert("请输入有效的提醒间隔（分钟）！");
      return;
    }

    // 根据当前状态决定是启动还是更新/停止
    // (简单起见，我们总是发送 'start'，让 background 负责处理)
    // 你也可以根据按钮文本或当前状态发送 'stop' 指令
    chrome.runtime.sendMessage(
      { command: "start", interval: interval },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("启动提醒时出错:", chrome.runtime.lastError.message);
          statusDisplay.textContent = "状态：启动失败";
        } else if (response) {
          statusDisplay.textContent = `状态：提醒已启动，每 ${response.interval} 分钟一次。`;
          saveButton.textContent = "更新设置";
          // 可选：短暂显示成功消息
          const originalText = saveButton.textContent;
          saveButton.textContent = "已保存!";
          saveButton.disabled = true;
          setTimeout(() => {
            saveButton.textContent = originalText;
            saveButton.disabled = false;
          }, 1500);
        } else {
          statusDisplay.textContent = "状态：无响应";
        }
      }
    );
  });

  // (可选) 添加停止按钮逻辑
  const stopButton = document.createElement("button");
  stopButton.textContent = "停止提醒";
  stopButton.id = "stop";
  stopButton.style.marginTop = "10px"; // 加点间距
  stopButton.style.backgroundColor = "#f44336"; // 红色表示停止
  stopButton.style.background = "linear-gradient(to bottom, #ef5350, #c62828)";

  stopButton.addEventListener("click", () => {
    chrome.runtime.sendMessage({ command: "stop" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("停止提醒时出错:", chrome.runtime.lastError.message);
        statusDisplay.textContent = "状态：停止失败";
      } else if (response) {
        statusDisplay.textContent = `状态：${response.status}`; // 应该是 '提醒已停止'
        saveButton.textContent = "启动提醒";
        // 可选：更新按钮状态
        const originalText = stopButton.textContent;
        stopButton.textContent = "已停止!";
        stopButton.disabled = true;
        setTimeout(() => {
          stopButton.textContent = originalText;
          stopButton.disabled = false;
        }, 1500);
      } else {
        statusDisplay.textContent = "状态：无响应";
      }
    });
  });
  // 将停止按钮添加到容器
  saveButton.parentNode.insertBefore(stopButton, statusDisplay);
});
