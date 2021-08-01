package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"time"

	"github.com/chromedp/cdproto/dom"
	"github.com/chromedp/chromedp"
)

func main() {
	var url string
	js := ""

	flag.StringVar(&url, "url", "", "")
	flag.StringVar(&js, "js", "", "")

	flag.Parse()

	ctx, cancel := chromedp.NewContext(
		context.Background(),
	)
	defer cancel()

	var consoleDom string
	var jsOut interface{}

	tasks := getDom(url, &consoleDom)
	if js != "" {
		tasks = append(tasks, chromedp.EvaluateAsDevTools(js, &jsOut))
	}
	err := chromedp.Run(ctx, tasks)

	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("%s\n", consoleDom)
	if jsOut != "" {
		fmt.Print("\nEvaluated JS:\n")
		fmt.Printf("%v\n", jsOut)
	}
}

func getDom(url string, domHtml *string) chromedp.Tasks {
	return chromedp.Tasks{
		chromedp.Navigate(url),
		chromedp.Sleep(2000 * time.Millisecond),
		chromedp.ActionFunc(func(ctx context.Context) error {
			node, err := dom.GetDocument().Do(ctx)
			if err != nil {
				return err
			}

			*domHtml, err = dom.GetOuterHTML().WithNodeID(node.NodeID).Do(ctx)

			return err
		}),
	}
}
