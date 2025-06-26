const { exec } = require('child_process');

exports.runAnsiblePlaybook = (req, res) => {
  // Example: ansible-playbook playbook.yml --extra-vars "host=xyz"
  exec('ansible-playbook playbook.yml', (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: stderr || error.message });
    }
    res.json({ output: stdout });
  });
};