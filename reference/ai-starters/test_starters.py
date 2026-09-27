import json
import os
from pathlib import Path
import unittest
from unittest.mock import patch
import ai_client
import rag

class StarterTests(unittest.TestCase):
    def test_default_mock(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertIn('MOCK', ai_client.complete('hello'))

    def test_validation(self):
        for prompt in ('', None, 'a' * 12001):
            with self.assertRaises(ValueError):
                ai_client.complete(prompt)

    def test_rag(self):
        self.assertEqual(rag.retrieve('Brev')[0][0], 'S1')
        self.assertEqual(rag.retrieve('unrelatedxyz'), [])
        self.assertIn('No relevant source', rag.answer('unrelatedxyz'))

    def test_local_endpoint_boundary(self):
        with patch.dict(os.environ, {'AI_PROVIDER':'ollama','AI_MODEL':'test','AI_BASE_URL':'https://external.invalid/v1'}, clear=True):
            with self.assertRaises(ValueError):
                ai_client.complete('hello')

    def test_request_shape_without_network(self):
        from io import BytesIO
        for provider in ('gemini','groq','ollama','lmstudio'):
            response = {'candidates':[{'content':{'parts':[{'text':'ok'}]}}]} if provider == 'gemini' else {'choices':[{'message':{'content':'ok'}}]}
            with patch.dict(os.environ, {'AI_PROVIDER':provider,'AI_MODEL':'test','AI_API_KEY':'dummy-test-only'}, clear=True), patch('urllib.request.urlopen', return_value=BytesIO(json.dumps(response).encode())) as request:
                self.assertEqual(ai_client.complete('public test'), 'ok')
                self.assertNotIn('dummy-test-only', request.call_args.args[0].full_url)

    def test_notebook(self):
        book = json.loads(Path(__file__).with_name('kaggle_notebook.ipynb').read_text())
        self.assertEqual(book['nbformat'], 4)
        for cell in book['cells']:
            if cell['cell_type'] == 'code':
                compile(''.join(cell['source']), '<notebook>', 'exec')
                self.assertEqual(cell['outputs'], [])

if __name__ == '__main__':
    unittest.main()
