// Legacy unauthenticated endpoint retired; account requests use aiWorkspace.
export default function(req,res){res.statusCode=401;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify({error:'Sign in and open Nova AI to use your account token allowance.'}))}
