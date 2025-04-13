const ALARM_NAME = "drinkWaterAlarm";

// 监听插件安装或更新事件
chrome.runtime.onInstalled.addListener(() => {
  console.log("喝水提醒插件已安装或更新。");
  // 可以在这里设置默认值
  chrome.storage.sync.get("interval", ({ interval }) => {
    if (!interval) {
      chrome.storage.sync.set({ interval: 60 }); // 默认60分钟
    }
  });
});

// 监听来自 popup.js 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === "start") {
    startAlarm(message.interval);
    sendResponse({ status: "提醒已启动", interval: message.interval });
  } else if (message.command === "stop") {
    stopAlarm();
    sendResponse({ status: "提醒已停止" });
  } else if (message.command === "getStatus") {
    chrome.alarms.get(ALARM_NAME, (alarm) => {
      if (alarm) {
        chrome.storage.sync.get("interval", ({ interval }) => {
          sendResponse({ status: "运行中", interval: interval });
        });
      } else {
        sendResponse({ status: "已停止" });
      }
    });
    // 保持消息通道开放以进行异步响应
    return true;
  }
});

// 监听闹钟事件
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    // 获取最新的间隔设置，以防用户在运行时更改了设置
    chrome.storage.sync.get("interval", ({ interval }) => {
      if (interval) {
        showNotification();
        // 重新创建闹钟以确保持续提醒
        // 注意：Manifest V3 中，非持久性 background script 可能在事件后终止
        // alarms API 设计为即使 service worker 终止也能可靠触发
        // 所以理论上不需要在这里手动重启闹钟，除非你想确保下一次触发时间是精确的 interval 分钟后
        // chrome.alarms.create(ALARM_NAME, { periodInMinutes: interval });
      } else {
        console.warn("无法获取提醒间隔，停止提醒。");
        stopAlarm();
      }
    });
  }
});

// 启动闹钟
function startAlarm(interval) {
  // 先清除可能存在的旧闹钟
  chrome.alarms.clear(ALARM_NAME, (wasCleared) => {
    console.log(`旧闹钟已清除: ${wasCleared}`);
    // 创建新的周期性闹钟
    chrome.alarms.create(ALARM_NAME, {
      delayInMinutes: interval, // 首次触发延迟
      periodInMinutes: interval, // 重复周期
    });
    chrome.storage.sync.set({ interval: interval });
    console.log(`喝水提醒闹钟已设置，间隔: ${interval} 分钟`);
  });
}

// 停止闹钟
function stopAlarm() {
  chrome.alarms.clear(ALARM_NAME, (wasCleared) => {
    console.log(`闹钟已停止: ${wasCleared}`);
    // 可选：清除存储的间隔或保留以便下次使用
    // chrome.storage.sync.remove('interval');
  });
}

// 显示喝水通知
function showNotification() {
  const notificationOptions = {
    type: "basic",
    iconUrl: "icons/icon128.png", // 确保图标存在
    title: "该喝水啦！💧",
    message: "喝口水，给身体充充电💧保持活力每一天！",
    priority: 2, // 设置优先级，使其更可能被用户注意到
  };

  // 使用随机 ID 确保每次都能显示新通知 (可选)
  const notificationId = `drinkWaterNotification_${Date.now()}`;

  chrome.notifications.create(notificationId, notificationOptions, (id) => {
    if (chrome.runtime.lastError) {
      console.error("创建通知失败:", chrome.runtime.lastError.message);
    } else {
      console.log("喝水通知已显示:", id);
      // 可选：添加点击通知的监听器
      chrome.notifications.onClicked.addListener(handleNotificationClick);
    }
  });
}

// 可选：处理通知点击事件
function handleNotificationClick(notificationId) {
  if (notificationId.startsWith("drinkWaterNotification_")) {
    console.log("喝水通知被点击:", notificationId);
    // 例如，可以打开一个关于喝水好处的网页
    // chrome.tabs.create({ url: 'https://example.com/hydration-benefits' });
    // 清除通知
    chrome.notifications.clear(notificationId);
  }
}

// 初始检查闹钟状态，以防 service worker 重启
chrome.alarms.get(ALARM_NAME, (alarm) => {
  if (alarm) {
    console.log("后台脚本启动，检测到闹钟正在运行:", alarm);
  } else {
    console.log("后台脚本启动，没有检测到运行中的闹钟。");
  }
});
