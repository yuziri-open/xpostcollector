/**
 * X Post Collector - GAS endpoint
 * Deploy: Web app (Anyone with link)
 * POST: Save posts to sheet
 * GET: Read recent posts (?action=recent&hours=24)
 */
function doPost(e) {
  try {
    var payload = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    var posts = Array.isArray(payload.posts) ? payload.posts : [];
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    if (!posts.length) {
      return jsonOutput({ ok: true, count: 0 });
    }

    var now = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss");
    var rows = posts.map(function(post) {
      return [
        post.timestamp || "",
        post.displayName || "",
        post.handle || "",
        post.text || "",
        post.url || "",
        post.likes || "0",
        post.retweets || "0",
        post.replies || "0",
        post.views || "0",
        post.hasMedia ? "TRUE" : "FALSE",
        now
      ];
    });

    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 11).setValues(rows);
    return jsonOutput({ ok: true, count: rows.length });
  } catch (error) {
    console.warn(error);
    return jsonOutput({ ok: false, error: String(error) });
  }
}

function doGet(e) {
  try {
    var params = e ? e.parameter : {};
    var action = params.action || "status";

    if (action === "status") {
      return jsonOutput({ ok: true, message: "X Post Collector endpoint is alive." });
    }

    if (action === "recent") {
      var hours = parseInt(params.hours || "24", 10);
      var cutoff = new Date();
      cutoff.setHours(cutoff.getHours() - hours);

      var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
      var lastRow = sheet.getLastRow();
      if (lastRow < 2) {
        return jsonOutput({ ok: true, posts: [], count: 0 });
      }

      var data = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
      var posts = [];

      for (var i = 0; i < data.length; i++) {
        var row = data[i];
        var collectedAt = row[10]; // K列: 収集日時
        var collectedDate;

        if (collectedAt instanceof Date) {
          collectedDate = collectedAt;
        } else {
          collectedDate = new Date(String(collectedAt));
        }

        if (isNaN(collectedDate.getTime()) || collectedDate < cutoff) {
          continue;
        }

        posts.push({
          timestamp: String(row[0]),
          displayName: String(row[1]),
          handle: String(row[2]),
          text: String(row[3]),
          url: String(row[4]),
          likes: String(row[5]),
          retweets: String(row[6]),
          replies: String(row[7]),
          views: String(row[8]),
          hasMedia: String(row[9]),
          collectedAt: Utilities.formatDate(collectedDate, "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss")
        });
      }

      return jsonOutput({ ok: true, posts: posts, count: posts.length });
    }

    return jsonOutput({ ok: false, error: "Unknown action: " + action });
  } catch (error) {
    console.warn(error);
    return jsonOutput({ ok: false, error: String(error) });
  }
}

function jsonOutput(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
